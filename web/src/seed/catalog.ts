// The demo category tree and the fields listings carry in each part of it.
// A field named under a category applies to everything below that category.

type FieldSeed = {
  label: string;
  type: "text" | "number" | "select" | "multiselect" | "boolean";
  options?: string[];
  unit?: string;
  required?: boolean;
  filterable?: boolean;
};

export type CategorySeed = {
  name: string;
  fields?: FieldSeed[];
  children?: CategorySeed[];
};

const condition: FieldSeed = {
  label: "Condition",
  type: "select",
  options: ["New", "Like new", "Good", "Fair", "For parts"],
  required: true,
  filterable: true,
};

const brand: FieldSeed = { label: "Brand", type: "text", filterable: true };

// The seed creates one field per label and attaches it wherever it is named,
// so a label that appears twice must be defined the same way both times.
export const catalog: CategorySeed[] = [
  {
    name: "Vehicles",
    children: [
      {
        name: "Cars & Trucks",
        fields: [
          { label: "Make", type: "text", required: true, filterable: true },
          { label: "Model", type: "text", required: true, filterable: true },
          { label: "Year", type: "number", required: true, filterable: true },
          {
            label: "Mileage",
            type: "number",
            unit: "mi",
            required: true,
            filterable: true,
          },
          {
            label: "Transmission",
            type: "select",
            options: ["Automatic", "Manual"],
            filterable: true,
          },
          {
            label: "Fuel",
            type: "select",
            options: ["Gas", "Diesel", "Hybrid", "Electric"],
            filterable: true,
          },
          {
            label: "Title",
            type: "select",
            options: ["Clean", "Rebuilt", "Salvage", "Lien"],
            required: true,
            filterable: true,
          },
        ],
      },
      {
        name: "Motorcycles",
        fields: [
          { label: "Make", type: "text", required: true, filterable: true },
          { label: "Year", type: "number", required: true, filterable: true },
          {
            label: "Mileage",
            type: "number",
            unit: "mi",
            required: true,
            filterable: true,
          },
        ],
      },
      { name: "RVs & Campers", fields: [condition] },
      { name: "Boats", fields: [condition] },
      { name: "Auto Parts", fields: [condition, brand] },
    ],
  },
  {
    name: "Electronics",
    fields: [condition, brand],
    children: [
      {
        name: "Cell Phones",
        fields: [
          {
            label: "Storage",
            type: "select",
            options: ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB"],
            filterable: true,
          },
          {
            label: "Carrier",
            type: "select",
            options: ["Unlocked", "AT&T", "T-Mobile", "Verizon", "Other"],
            filterable: true,
          },
        ],
      },
      { name: "Computers & Tablets" },
      { name: "TVs & Audio" },
      { name: "Cameras" },
      { name: "Video Games & Consoles" },
    ],
  },
  {
    name: "Home & Garden",
    fields: [condition],
    children: [
      {
        name: "Furniture",
        fields: [
          {
            label: "Material",
            type: "select",
            options: ["Wood", "Metal", "Upholstered", "Glass", "Other"],
            filterable: true,
          },
          { label: "Assembly required", type: "boolean" },
        ],
      },
      { name: "Appliances", fields: [brand] },
      { name: "Tools", fields: [brand] },
      { name: "Lawn & Garden" },
      { name: "Home Decor" },
    ],
  },
  {
    name: "Clothing & Accessories",
    fields: [condition, brand],
    children: [
      { name: "Women's Clothing", fields: [{ label: "Size", type: "text" }] },
      { name: "Men's Clothing", fields: [{ label: "Size", type: "text" }] },
      { name: "Shoes", fields: [{ label: "Size", type: "text" }] },
      { name: "Jewelry & Watches" },
    ],
  },
  {
    name: "Sports & Outdoors",
    fields: [condition],
    children: [
      {
        name: "Bikes",
        fields: [
          brand,
          {
            label: "Bike type",
            type: "select",
            options: ["Road", "Mountain", "Hybrid", "Electric", "Kids"],
            filterable: true,
          },
          { label: "Frame size", type: "text" },
        ],
      },
      { name: "Exercise Equipment" },
      { name: "Camping & Hiking" },
      { name: "Fishing & Hunting" },
    ],
  },
  {
    name: "Baby & Kids",
    fields: [condition],
    children: [
      { name: "Strollers & Car Seats", fields: [brand] },
      { name: "Toys" },
      { name: "Kids' Furniture" },
    ],
  },
  {
    name: "Hobbies",
    fields: [condition],
    children: [
      { name: "Musical Instruments", fields: [brand] },
      { name: "Books" },
      { name: "Collectibles" },
      { name: "Arts & Crafts" },
    ],
  },
];
