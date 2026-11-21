import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../../core/format.dart';
import '../../../core/forms/form_submission.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/centered_message.dart';
import '../../../core/widgets/submit_button.dart';
import '../../auth/application/auth_controller.dart';
import '../../categories/data/categories_api.dart';
import '../../categories/data/category.dart';
import '../../listings/data/listing.dart';
import '../../listings/data/listings_api.dart';
import 'photos_step.dart';
import 'post_steps.dart';

/// The listing being edited and the questions its category asks. The form
/// needs both before it can open filled in.
final _editingProvider = FutureProvider.autoDispose
    .family<(Listing, List<ListingField>), String>((ref, id) async {
      final listings = await ref.watch(ownListingsProvider.future);
      final listing = listings.where((item) => item.id == id).firstOrNull;
      if (listing == null) {
        throw const ApiError(
          code: 'not_found',
          message: 'That listing no longer exists.',
        );
      }

      final api = ref.watch(listingsApiProvider);
      return (listing, await api.fieldsFor(listing.categoryId));
    });

/// Posts a new listing, or edits the one named by [listingId], one step at
/// a time.
class PostListingScreen extends ConsumerWidget {
  const PostListingScreen({super.key, this.listingId});

  final String? listingId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categories = ref.watch(categoriesProvider);
    final editing = listingId == null
        ? null
        : ref.watch(_editingProvider(listingId!));

    if (categories.hasValue && (editing == null || editing.hasValue)) {
      final (listing, fields) = editing?.requireValue ?? (null, null);
      return _Form(
        categories: categories.requireValue,
        listing: listing,
        fields: fields ?? const [],
      );
    }

    final error = categories.error ?? editing?.error;
    return Scaffold(
      appBar: AppBar(),
      body: error == null
          ? const Center(child: CircularProgressIndicator())
          : CenteredMessage(
              title: "Couldn't open the form",
              detail: error is ApiError ? error.message : 'Try again.',
              action: OutlinedButton(
                onPressed: () {
                  ref.invalidate(categoriesProvider);
                  ref.invalidate(ownListingsProvider);
                },
                child: const Text('Try again'),
              ),
            ),
    );
  }
}

enum _Step {
  category,
  details,
  photos,
  fields,
  location,
  review;

  /// Whether a field the server refused is answered on this step.
  bool owns(String field) => switch (this) {
    category => field == 'categoryId',
    details =>
      field == 'title' || field == 'description' || field.startsWith('price'),
    photos => field.startsWith('photoIds'),
    fields => field.startsWith('attributes.'),
    location => field == 'placeId',
    review => false,
  };
}

class _Form extends ConsumerStatefulWidget {
  const _Form({required this.categories, required this.fields, this.listing});

  final List<Category> categories;
  final List<ListingField> fields;
  final Listing? listing;

  @override
  ConsumerState<_Form> createState() => _FormState();
}

class _FormState extends ConsumerState<_Form> with FormSubmission {
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _amount = TextEditingController();
  final _maxAmount = TextEditingController();

  /// A controller for each typed answer, and the picked ones by field id.
  final _texts = <String, TextEditingController>{};
  final _answers = <String, Object>{};

  /// In the seller's order. Each uploads as soon as it is picked.
  final _photos = <PostPhoto>[];

  var _step = _Step.category;
  var _mode = PriceMode.fixed;
  var _fields = const <ListingField>[];
  var _showPhone = false;
  String? _categoryId;

  /// The level of the category tree the first step is showing.
  String? _browsing;
  Place? _place;

  @override
  void initState() {
    super.initState();

    final listing = widget.listing;
    if (listing == null) return;

    _step = _Step.details;
    _categoryId = listing.categoryId;
    _browsing = widget.categories.byId(listing.categoryId)?.parentId;
    _title.text = listing.title;
    _description.text = listing.description;
    _mode = listing.price.mode;
    _amount.text = typedDollars(listing.price.cents);
    _maxAmount.text = typedDollars(listing.price.maxCents);
    _place = Place(
      id: listing.placeId,
      label: [?listing.zip, listing.place].join(' · '),
    );
    _showPhone = listing.showPhone;
    _photos.addAll([
      for (final photo in listing.photos) PostPhoto(photo: photo),
    ]);
    _adoptFields(widget.fields, {
      for (final attribute in listing.attributes)
        attribute.fieldId: attribute.value,
    });
  }

  @override
  void dispose() {
    for (final controller in [
      _title,
      _description,
      _amount,
      _maxAmount,
      ..._texts.values,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  /// Takes on a category's questions, keeping answers already given to the
  /// ones it shares with the last category.
  void _adoptFields(
    List<ListingField> fields, [
    Map<String, Object> saved = const {},
  ]) {
    _fields = fields;
    for (final field in fields) {
      final answer = saved[field.id];
      if (field.type == FieldType.text || field.type == FieldType.number) {
        _texts.putIfAbsent(
          field.id,
          () => TextEditingController(text: answer?.toString()),
        );
      } else if (answer != null) {
        _answers[field.id] = answer is List ? answer.cast<String>() : answer;
      }
    }
  }

  List<_Step> get _steps => [
    _Step.category,
    _Step.details,
    _Step.photos,
    if (_fields.isNotEmpty) _Step.fields,
    _Step.location,
    _Step.review,
  ];

  ListingPrice get _price => ListingPrice(
    mode: _mode,
    cents: parseDollars(_amount.text),
    maxCents: parseDollars(_maxAmount.text),
  );

  /// What the seller answered, in the shape the API takes, or null for a
  /// question left blank. A number that doesn't parse stays as typed, so it
  /// can be pointed out.
  Object? _answerTo(ListingField field) {
    switch (field.type) {
      case FieldType.text:
      case FieldType.number:
        final typed = _texts[field.id]!.text.trim();
        if (typed.isEmpty) return null;
        if (field.type == FieldType.text) return typed;
        return num.tryParse(typed.replaceAll(',', '')) ?? typed;
      case FieldType.select:
        return _answers[field.id];
      case FieldType.multiselect:
        final chosen = _answers[field.id] as List<String>?;
        return chosen == null || chosen.isEmpty ? null : chosen;
      case FieldType.boolean:
        return _answers[field.id] == true;
    }
  }

  // The same rules the server applies, so most mistakes are caught on the
  // step where they are made.
  Map<String, String> _check(_Step step) {
    final errors = <String, String>{};

    switch (step) {
      case _Step.category:
        if (_categoryId == null) errors['categoryId'] = 'Choose a category.';
      case _Step.details:
        final title = _title.text.trim().length;
        if (title < 5) errors['title'] = 'Use at least 5 characters.';
        if (title > 80) errors['title'] = 'Use 80 characters or fewer.';

        final description = _description.text.trim().length;
        if (description < 20) {
          errors['description'] = 'Say a little more: at least 20 characters.';
        }
        if (description > 4000) {
          errors['description'] = 'Use 4,000 characters or fewer.';
        }

        final ListingPrice(:cents, :maxCents) = _price;
        if (_mode.hasAmount && (cents ?? 0) == 0) {
          errors['price.cents'] = 'Enter a price.';
        }
        if (_mode == PriceMode.range) {
          if ((maxCents ?? 0) == 0) {
            errors['price.maxCents'] = 'Enter a price.';
          } else if (maxCents! <= (cents ?? 0)) {
            errors['price.maxCents'] =
                'The top of the range must be higher than the bottom.';
          }
        }
      case _Step.photos:
        if (_photos.any((photo) => photo.uploading)) {
          errors['photoIds'] = 'Wait for the photos to finish uploading.';
        } else if (_photos.any((photo) => photo.failed)) {
          errors['photoIds'] =
              "Some photos didn't upload. Try them again or remove them.";
        }
      case _Step.fields:
        for (final field in _fields) {
          final answer = _answerTo(field);
          if (answer == null && field.required) {
            errors['attributes.${field.id}'] =
                'Enter the ${field.label.toLowerCase()}.';
          }
          if (field.type == FieldType.number && answer is String) {
            errors['attributes.${field.id}'] = 'Enter a number.';
          }
        }
      case _Step.location:
        if (_place == null) {
          errors['placeId'] = 'Choose a location from the list.';
        }
      case _Step.review:
    }
    return errors;
  }

  void _continue() {
    final errors = _check(_step);
    setState(() {
      fieldErrors = errors;
      formError = null;
      if (errors.isEmpty) _step = _steps[_steps.indexOf(_step) + 1];
    });
  }

  void _back() => setState(() => _step = _steps[_steps.indexOf(_step) - 1]);

  Future<void> _chooseCategory(Category category) async {
    final api = ref.read(listingsApiProvider);
    late final List<ListingField> fields;
    if (!await submit(() async => fields = await api.fieldsFor(category.id))) {
      return;
    }

    setState(() {
      _categoryId = category.id;
      _adoptFields(fields);
      _step = _Step.details;
    });
  }

  Future<void> _addPhotos() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(LucideIcons.images, size: 20),
              title: const Text('Choose from the gallery'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(LucideIcons.camera, size: 20),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;

    // Phones take photos far larger than a listing needs. Shrinking them
    // here makes the upload quick; the server makes the final sizes.
    final picker = ImagePicker();
    const edge = 2048.0;
    final room = maxPhotos - _photos.length;
    List<XFile> files;
    try {
      files = source == ImageSource.gallery && room > 1
          ? await picker.pickMultiImage(
              maxWidth: edge,
              maxHeight: edge,
              imageQuality: 85,
              limit: room,
            )
          : [
              ?await picker.pickImage(
                source: source,
                maxWidth: edge,
                maxHeight: edge,
                imageQuality: 85,
              ),
            ];
    } on PlatformException {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Couldn't open your photos.")),
        );
      }
      return;
    }

    for (final file in files.take(room)) {
      final photo = PostPhoto(
        bytes: await file.readAsBytes(),
        contentType: file.mimeType ?? 'image/jpeg',
      );
      if (!mounted) return;
      setState(() {
        _photos.add(photo);
        fieldErrors = const {};
      });
      _upload(photo);
    }
  }

  Future<void> _upload(PostPhoto photo) async {
    PostPhoto next;
    try {
      final uploaded = await ref
          .read(listingsApiProvider)
          .uploadPhoto(photo.bytes!, photo.contentType);
      next = PostPhoto(bytes: photo.bytes, photo: uploaded);
    } on ApiError {
      next = PostPhoto(
        bytes: photo.bytes,
        contentType: photo.contentType,
        failed: true,
      );
    }
    // The seller may have removed it while it uploaded.
    final index = _photos.indexOf(photo);
    if (mounted && index != -1) setState(() => _photos[index] = next);
  }

  Future<void> _openPhoto(int index) async {
    final photo = _photos[index];
    final action = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (photo.failed)
              ListTile(
                leading: const Icon(LucideIcons.refreshCw, size: 20),
                title: const Text('Try again'),
                onTap: () => Navigator.pop(context, 'retry'),
              ),
            if (index > 0 && photo.photo != null)
              ListTile(
                leading: const Icon(LucideIcons.arrowUpToLine, size: 20),
                title: const Text('Make it the cover'),
                onTap: () => Navigator.pop(context, 'cover'),
              ),
            ListTile(
              leading: const Icon(LucideIcons.trash2, size: 20),
              title: const Text('Remove'),
              onTap: () => Navigator.pop(context, 'remove'),
            ),
          ],
        ),
      ),
    );
    if (!mounted) return;

    switch (action) {
      case 'retry':
        final again = PostPhoto(
          bytes: photo.bytes,
          contentType: photo.contentType,
        );
        setState(() => _photos[index] = again);
        _upload(again);
      case 'cover':
        setState(() => _photos.insert(0, _photos.removeAt(index)));
      case 'remove':
        setState(() {
          _photos.removeAt(index);
          fieldErrors = const {};
        });
    }
  }

  void _choosePlace(Place? place) => setState(() {
    _place = place;
    if (place != null) fieldErrors = const {};
  });

  Future<void> _send() async {
    final api = ref.read(listingsApiProvider);
    final editing = widget.listing;
    final draft = ListingDraft(
      title: _title.text.trim(),
      description: _description.text.trim(),
      categoryId: _categoryId!,
      price: _price,
      attributes: {for (final field in _fields) field.id: ?_answerTo(field)},
      placeId: _place!.id,
      showPhone: _showPhone,
      photoIds: [for (final photo in _photos) ?photo.photo?.id],
    );

    final sent = await submit(
      () => editing == null ? api.post(draft) : api.revise(editing.id, draft),
    );
    if (!mounted) return;

    if (sent) {
      ref.invalidate(ownListingsProvider);
      context.pop();
      return;
    }

    // Go back to the step with the first answer the server refused.
    final refused = _steps.where((step) => fieldErrors.keys.any(step.owns));
    if (refused.isNotEmpty) setState(() => _step = refused.first);
  }

  List<String> _pathTo(String categoryId) {
    final names = <String>[];
    for (
      var category = widget.categories.byId(categoryId);
      category != null;
      category = category.parentId == null
          ? null
          : widget.categories.byId(category.parentId!)
    ) {
      names.insert(0, category.name);
    }
    return names;
  }

  List<(String, String)> _summary({required bool hasPhone}) => [
    ('Category', _pathTo(_categoryId!).join(' / ')),
    ('Title', _title.text.trim()),
    ('Price', _price.label),
    ('Photos', _photos.isEmpty ? 'None' : '${_photos.length}'),
    for (final field in _fields)
      if (_answerTo(field) case final answer?)
        (
          field.label,
          ListingAttribute(
            fieldId: field.id,
            label: field.label,
            unit: field.unit,
            value: answer,
          ).text,
        ),
    ('Location', _place!.label),
    if (hasPhone) ('Phone', _showPhone ? 'Shown to buyers' : 'Hidden'),
  ];

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final steps = _steps;
    final position = steps.indexOf(_step) + 1;
    final editing = widget.listing != null;
    final hasPhone = ref.watch(authControllerProvider).value?.phone != null;

    return PopScope(
      // Back steps through the form; only the first step leaves it.
      canPop: position == 1,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _back();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(editing ? 'Edit listing' : 'New listing'),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 20),
              child: Center(
                child: Text(
                  '$position of ${steps.length}',
                  style: Theme.of(context).textTheme.bodyMedium
                      ?.copyWith(color: palette.muted),
                ),
              ),
            ),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(2),
            child: LinearProgressIndicator(
              value: position / steps.length,
              minHeight: 2,
              color: palette.text,
              backgroundColor: palette.border,
            ),
          ),
        ),
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  // Each step starts at its top.
                  key: ValueKey(_step),
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                  child: switch (_step) {
                    _Step.category => CategoryStep(
                      categories: widget.categories,
                      parentId: _browsing,
                      selectedId: _categoryId,
                      onOpen: (id) => setState(() => _browsing = id),
                      onChoose: _chooseCategory,
                      error: fieldErrors['categoryId'] ?? formError,
                    ),
                    _Step.details => DetailsStep(
                      title: _title,
                      description: _description,
                      amount: _amount,
                      maxAmount: _maxAmount,
                      mode: _mode,
                      onModeChanged: (mode) => setState(() => _mode = mode),
                      errors: fieldErrors,
                    ),
                    _Step.photos => PhotosStep(
                      photos: _photos,
                      onAdd: _addPhotos,
                      onOpen: _openPhoto,
                      error: fieldErrors['photoIds'],
                    ),
                    _Step.fields => FieldsStep(
                      fields: _fields,
                      answers: _answers,
                      texts: _texts,
                      onAnswer: (id, answer) => setState(
                        () => answer == null
                            ? _answers.remove(id)
                            : _answers[id] = answer,
                      ),
                      errors: fieldErrors,
                    ),
                    _Step.location => LocationStep(
                      selected: _place,
                      onSelect: _choosePlace,
                      showPhone: hasPhone ? _showPhone : null,
                      onShowPhoneChanged: (show) =>
                          setState(() => _showPhone = show),
                      error: fieldErrors['placeId'],
                    ),
                    _Step.review => ReviewStep(
                      rows: _summary(hasPhone: hasPhone),
                      description: _description.text.trim(),
                      editing: editing,
                      error: formError ?? fieldErrors.values.firstOrNull,
                      onSeePackages: errorCode == 'payment_required'
                          ? () => context.push('/account/packages')
                          : null,
                    ),
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: SizedBox(
                  width: double.infinity,
                  child: SubmitButton(
                    label: switch (_step) {
                      _Step.review when editing => 'Save changes',
                      _Step.review => 'Post listing',
                      _ => 'Continue',
                    },
                    busy: submitting,
                    onPressed: _step == _Step.review ? _send : _continue,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
