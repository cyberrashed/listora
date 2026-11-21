// Demo listings. Each names its seller by email, its category by name, its
// answers by field label and its city as "City, ST". `fate` is what review
// did with it, and `daysAgo` when it was posted.

type Price =
  | { mode: "fixed" | "negotiable"; cents: number }
  | { mode: "range"; cents: number; maxCents: number }
  | { mode: "on_request" | "free" };

export type ListingSeed = {
  seller: string;
  title: string;
  description: string;
  category: string;
  price: Price;
  answers?: Record<string, string | number | boolean>;
  city: string;
  daysAgo: number;
  fate?:
    "approved" | "sold" | { rejected: "soft" | "permanent"; reason: string };
};

const dana = "dana.whitfield@mailbox.example";
const miguel = "miguel.ortega@postbox.example";
const hannah = "hannah.brooks@inbox.example";
const tyrone = "tyrone.jefferson@mailbox.example";
const meiling = "meiling.chow@postbox.example";
const aaliyah = "aaliyah.simmons@mailbox.example";
const sofia = "sofia.marchetti@inbox.example";
const rachel = "rachel.steinberg@postbox.example";
const caleb = "caleb.nowak@inbox.example";
const wyatt = "wyatt.lindgren@postbox.example";
const darnell = "darnell.okafor@mailbox.example";
const luis = "luis.navarro@inbox.example";

export const listings: ListingSeed[] = [
  {
    seller: dana,
    title: "2015 Honda Civic LX, one owner",
    description:
      "Bought new in Austin and serviced at the dealer every 5,000 miles. New tires in March, brakes done last fall. No accidents. Selling because we moved downtown and no longer need two cars.",
    category: "Cars & Trucks",
    price: { mode: "negotiable", cents: 890000 },
    answers: {
      Make: "Honda",
      Model: "Civic LX",
      Year: 2015,
      Mileage: 84250,
      Transmission: "Automatic",
      Fuel: "Gas",
      Title: "Clean",
    },
    city: "Austin, TX",
    daysAgo: 12,
    fate: "approved",
  },
  {
    seller: tyrone,
    title: "2019 Ford F-150 XLT SuperCrew 4x4",
    description:
      "5.0 V8, tow package, spray-in bedliner. Highway miles from my commute to Boulder. Clean title in hand. Small scratch on the tailgate.",
    category: "Cars & Trucks",
    price: { mode: "fixed", cents: 2890000 },
    answers: {
      Make: "Ford",
      Model: "F-150 XLT",
      Year: 2019,
      Mileage: 61200,
      Transmission: "Automatic",
      Fuel: "Gas",
      Title: "Clean",
    },
    city: "Denver, CO",
    daysAgo: 5,
    fate: "approved",
  },
  {
    seller: miguel,
    title: "2008 Toyota Tacoma, needs transmission work",
    description:
      "Runs and drives but slips going into third. Body is straight, frame was replaced under the recall. Priced for someone who can do the work. Rebuilt title after a hail claim.",
    category: "Cars & Trucks",
    price: { mode: "fixed", cents: 450000 },
    answers: {
      Make: "Toyota",
      Model: "Tacoma",
      Year: 2008,
      Mileage: 212400,
      Transmission: "Manual",
      Fuel: "Gas",
      Title: "Rebuilt",
    },
    city: "Austin, TX",
    daysAgo: 0.21,
  },
  {
    seller: aaliyah,
    title: "2017 Yamaha MT-07, garage kept",
    description:
      "Second owner. Always garaged, never dropped. Fresh oil and chain last month. Comes with a tail tidy and the stock parts.",
    category: "Motorcycles",
    price: { mode: "fixed", cents: 520000 },
    answers: { Make: "Yamaha", Year: 2017, Mileage: 9800 },
    city: "Atlanta, GA",
    daysAgo: 9,
    fate: "approved",
  },
  {
    seller: meiling,
    title: "iPhone 14 Pro 256 GB, unlocked",
    description:
      "Deep purple, always in a case with a screen protector. Battery health at 89 percent. Box and unused cable included. Factory reset and ready to go.",
    category: "Cell Phones",
    price: { mode: "fixed", cents: 54000 },
    answers: {
      Condition: "Like new",
      Brand: "Apple",
      Storage: "256 GB",
      Carrier: "Unlocked",
    },
    city: "Seattle, WA",
    daysAgo: 3,
    fate: "approved",
  },
  {
    seller: rachel,
    title: "Samsung Galaxy S23, cracked back glass",
    description:
      "Works perfectly, screen is flawless. The back glass has a crack in one corner from a drop. T-Mobile, paid off. Priced to account for the repair.",
    category: "Cell Phones",
    price: { mode: "fixed", cents: 21000 },
    answers: {
      Condition: "Fair",
      Brand: "Samsung",
      Storage: "128 GB",
      Carrier: "T-Mobile",
    },
    city: "Denver, CO",
    daysAgo: 0.13,
  },
  {
    seller: hannah,
    title: "MacBook Air M1, 8 GB, 256 GB",
    description:
      "2020 model in space gray. Used for school, light wear on the bottom. Battery cycle count is 214. Charger included.",
    category: "Computers & Tablets",
    price: { mode: "negotiable", cents: 52000 },
    answers: { Condition: "Good", Brand: "Apple" },
    city: "Nashville, TN",
    daysAgo: 7,
    fate: "approved",
  },
  {
    seller: sofia,
    title: "55-inch LG OLED C2 with wall mount",
    description:
      "Bought in 2023, no burn-in. Moving across the country and can't take it with me. Tilting wall mount and the original remote included. You haul.",
    category: "TVs & Audio",
    price: { mode: "fixed", cents: 78000 },
    answers: { Condition: "Like new", Brand: "LG" },
    city: "Nashville, TN",
    daysAgo: 1.1,
  },
  {
    seller: dana,
    title: "Mid-century walnut dresser, six drawers",
    description:
      "Solid walnut with dovetail drawers. Refinished the top last year. 60 inches wide, 18 deep, 32 tall. A few small marks on the left side.",
    category: "Furniture",
    price: { mode: "fixed", cents: 42000 },
    answers: {
      Condition: "Good",
      Material: "Wood",
      "Assembly required": false,
    },
    city: "Austin, TX",
    daysAgo: 20,
    fate: "sold",
  },
  {
    seller: meiling,
    title: "Gray sectional sofa with chaise",
    description:
      "From a smoke-free home with no pets. Covers are removable and were washed last week. The chaise can go on either side. Comes apart into three pieces for moving.",
    category: "Furniture",
    price: { mode: "range", cents: 30000, maxCents: 38000 },
    answers: {
      Condition: "Good",
      Material: "Upholstered",
      "Assembly required": true,
    },
    city: "Seattle, WA",
    daysAgo: 4,
    fate: "approved",
  },
  {
    seller: tyrone,
    title: "DeWalt 20V drill and impact driver set",
    description:
      "Two batteries, charger and the hard case. Used on one deck project. Both tools work like new.",
    category: "Tools",
    price: { mode: "fixed", cents: 11000 },
    answers: { Condition: "Like new", Brand: "DeWalt" },
    city: "Denver, CO",
    daysAgo: 2,
    fate: "approved",
  },
  {
    seller: aaliyah,
    title: "Whirlpool top-load washer",
    description:
      "Works fine, we replaced it with a stacked unit. Three years old. Hoses included. Ground floor pickup, bring a dolly.",
    category: "Appliances",
    price: { mode: "fixed", cents: 18000 },
    answers: { Condition: "Good", Brand: "Whirlpool" },
    city: "Atlanta, GA",
    daysAgo: 0.05,
  },
  {
    seller: hannah,
    title: "Trek Marlin 7 mountain bike, size large",
    description:
      "29 inch wheels. New chain and brake pads in March. Rides great on Percy Warner trails. Pickup near Vanderbilt.",
    category: "Bikes",
    price: { mode: "fixed", cents: 48000 },
    answers: {
      Condition: "Good",
      Brand: "Trek",
      "Bike type": "Mountain",
      "Frame size": "Large",
    },
    city: "Nashville, TN",
    daysAgo: 6,
    fate: "approved",
  },
  {
    seller: sofia,
    title: "Kids bike with training wheels",
    description:
      "16 inch wheels, fits ages 4 to 6. Our daughter outgrew it. Free to a family who will use it.",
    category: "Bikes",
    price: { mode: "free" },
    answers: { Condition: "Fair", "Bike type": "Kids" },
    city: "Nashville, TN",
    daysAgo: 2,
    fate: "approved",
  },
  {
    seller: rachel,
    title: "Uppababy Vista stroller with bassinet",
    description:
      "2021 model in gray. Includes the bassinet, toddler seat, rain cover and bug net. Wheels and frame are in great shape.",
    category: "Strollers & Car Seats",
    price: { mode: "negotiable", cents: 45000 },
    answers: { Condition: "Good", Brand: "Uppababy" },
    city: "Denver, CO",
    daysAgo: 8,
    fate: "approved",
  },
  {
    seller: miguel,
    title: "Fender Player Stratocaster, sunburst",
    description:
      "Made in Mexico, 2019. Plays well, frets have plenty of life. A couple of dings on the lower edge. Gig bag included.",
    category: "Musical Instruments",
    price: { mode: "fixed", cents: 55000 },
    answers: { Condition: "Good", Brand: "Fender" },
    city: "Austin, TX",
    daysAgo: 3,
    fate: {
      rejected: "soft",
      reason: "Please add the serial number so buyers can check the year.",
    },
  },
  {
    seller: tyrone,
    title: "Replica designer watches, wholesale lot",
    description:
      "Lot of twenty replica watches, all popular brands. Look just like the real thing. Message for the full list.",
    category: "Jewelry & Watches",
    price: { mode: "on_request" },
    answers: { Condition: "New" },
    city: "Denver, CO",
    daysAgo: 1,
    fate: {
      rejected: "permanent",
      reason: "Counterfeit goods can't be listed on Listora.",
    },
  },
  {
    seller: dana,
    title: "Complete set of Lonesome Dove first editions",
    description:
      "All four novels in the series, hardcover first editions with dust jackets. Kept on a shelf away from sunlight. Would rather sell as a set.",
    category: "Books",
    price: { mode: "on_request" },
    answers: { Condition: "Good" },
    city: "Austin, TX",
    daysAgo: 0.02,
  },
  {
    seller: miguel,
    title: "2016 Subaru Outback 2.5i Premium",
    description:
      "All-wheel drive, heated seats, roof rails. Timing belt and water pump done at 90k. Two small door dings. Clean title, second owner.",
    category: "Cars & Trucks",
    price: { mode: "negotiable", cents: 1380000 },
    answers: {
      Make: "Subaru",
      Model: "Outback",
      Year: 2016,
      Mileage: 97300,
      Transmission: "Automatic",
      Fuel: "Gas",
      Title: "Clean",
    },
    city: "Round Rock, TX",
    daysAgo: 2,
    fate: "approved",
  },
  {
    seller: luis,
    title: "2021 Tesla Model 3 Standard Range Plus",
    description:
      "White on black. Battery shows 248 miles at full charge. Home charged, rarely supercharged. Includes the mobile connector and all-weather mats.",
    category: "Cars & Trucks",
    price: { mode: "fixed", cents: 2490000 },
    answers: {
      Make: "Tesla",
      Model: "Model 3",
      Year: 2021,
      Mileage: 38900,
      Transmission: "Automatic",
      Fuel: "Electric",
      Title: "Clean",
    },
    city: "Cedar Park, TX",
    daysAgo: 1,
    fate: "approved",
  },
  {
    seller: wyatt,
    title: "2012 Jeep Wrangler Sport, 6-speed",
    description:
      "Soft top, 33 inch tires on a two inch lift. Never been off-road harder than a forest road. Clutch replaced last year. Lien will be paid off at sale.",
    category: "Cars & Trucks",
    price: { mode: "fixed", cents: 1650000 },
    answers: {
      Make: "Jeep",
      Model: "Wrangler Sport",
      Year: 2012,
      Mileage: 118700,
      Transmission: "Manual",
      Fuel: "Gas",
      Title: "Lien",
    },
    city: "Boulder, CO",
    daysAgo: 6,
    fate: "approved",
  },
  {
    seller: darnell,
    title: "2018 Toyota Prius Two",
    description:
      "Averages 52 mpg on my commute. New 12 volt battery in January. Rear bumper was repainted after a parking lot scrape. Clean title.",
    category: "Cars & Trucks",
    price: { mode: "fixed", cents: 1590000 },
    answers: {
      Make: "Toyota",
      Model: "Prius",
      Year: 2018,
      Mileage: 72100,
      Transmission: "Automatic",
      Fuel: "Hybrid",
      Title: "Clean",
    },
    city: "Marietta, GA",
    daysAgo: 3,
    fate: "approved",
  },
  {
    seller: caleb,
    title: "2014 Ram 2500 Laramie Cummins",
    description:
      "6.7 diesel, fifth wheel prep, air bags in the rear. Pulled our camper for six summers. All emissions equipment in place.",
    category: "Cars & Trucks",
    price: { mode: "negotiable", cents: 3350000 },
    answers: {
      Make: "Ram",
      Model: "2500 Laramie",
      Year: 2014,
      Mileage: 143000,
      Transmission: "Automatic",
      Fuel: "Diesel",
      Title: "Clean",
    },
    city: "Franklin, TN",
    daysAgo: 10,
    fate: "approved",
  },
  {
    seller: meiling,
    title: "2010 Honda Fit Sport",
    description:
      "Great city car, fits in any spot on Capitol Hill. Some clear coat peeling on the roof. Runs without a single issue.",
    category: "Cars & Trucks",
    price: { mode: "fixed", cents: 620000 },
    answers: {
      Make: "Honda",
      Model: "Fit Sport",
      Year: 2010,
      Mileage: 131500,
      Transmission: "Manual",
      Fuel: "Gas",
      Title: "Clean",
    },
    city: "Seattle, WA",
    daysAgo: 8,
    fate: "approved",
  },
  {
    seller: wyatt,
    title: "2015 Harley-Davidson Iron 883",
    description:
      "Blacked out, short shot exhaust, new rear tire. Battery tender pigtail installed. Title in hand.",
    category: "Motorcycles",
    price: { mode: "fixed", cents: 610000 },
    answers: { Make: "Harley-Davidson", Year: 2015, Mileage: 14200 },
    city: "Lakewood, CO",
    daysAgo: 4,
    fate: "approved",
  },
  {
    seller: luis,
    title: "2020 Kawasaki Z400 ABS",
    description:
      "My first bike and I am moving up. Frame sliders, never down. Valves checked at the last service.",
    category: "Motorcycles",
    price: { mode: "negotiable", cents: 430000 },
    answers: { Make: "Kawasaki", Year: 2020, Mileage: 6100 },
    city: "Austin, TX",
    daysAgo: 5,
    fate: "approved",
  },
  {
    seller: caleb,
    title: "2019 Jayco Jay Flight 264BH travel trailer",
    description:
      "Sleeps eight with the bunks. New tires this spring, roof resealed. Stored under cover every winter. Weight distribution hitch included.",
    category: "RVs & Campers",
    price: { mode: "fixed", cents: 1890000 },
    answers: { Condition: "Good" },
    city: "Murfreesboro, TN",
    daysAgo: 14,
    fate: "approved",
  },
  {
    seller: darnell,
    title: "14 foot aluminum jon boat with trailer",
    description:
      "9.9 four stroke outboard that starts on the first pull. Trolling motor, two seats and a fish finder. Trailer has new bearings and lights.",
    category: "Boats",
    price: { mode: "fixed", cents: 320000 },
    answers: { Condition: "Good" },
    city: "Decatur, GA",
    daysAgo: 11,
    fate: "approved",
  },
  {
    seller: tyrone,
    title: "Set of four Michelin winter tires, 225/65R17",
    description:
      "X-Ice Snow, two seasons on them, about 8/32 of tread left. Off a RAV4. Stored in bags in the garage.",
    category: "Auto Parts",
    price: { mode: "fixed", cents: 38000 },
    answers: { Condition: "Good", Brand: "Michelin" },
    city: "Aurora, CO",
    daysAgo: 1,
    fate: "approved",
  },
  {
    seller: rachel,
    title: "Google Pixel 8, 128 GB",
    description:
      "Obsidian. Used for eight months with a case. Unlocked and works on any carrier. Comes with the box.",
    category: "Cell Phones",
    price: { mode: "fixed", cents: 36000 },
    answers: {
      Condition: "Like new",
      Brand: "Google",
      Storage: "128 GB",
      Carrier: "Unlocked",
    },
    city: "Boulder, CO",
    daysAgo: 2,
    fate: "approved",
  },
  {
    seller: hannah,
    title: "iPhone 12, 64 GB, Verizon",
    description:
      "Blue. New battery put in by Apple in August. A light scratch near the camera. Paid off and clean.",
    category: "Cell Phones",
    price: { mode: "fixed", cents: 19000 },
    answers: {
      Condition: "Good",
      Brand: "Apple",
      Storage: "64 GB",
      Carrier: "Verizon",
    },
    city: "Franklin, TN",
    daysAgo: 5,
    fate: "approved",
  },
  {
    seller: meiling,
    title: "Dell XPS 15, i7, 32 GB RAM, 1 TB",
    description:
      "2022 model with the OLED screen. Used for design work, always on a stand. Battery holds about five hours. Charger and sleeve included.",
    category: "Computers & Tablets",
    price: { mode: "negotiable", cents: 98000 },
    answers: { Condition: "Good", Brand: "Dell" },
    city: "Bellevue, WA",
    daysAgo: 3,
    fate: "approved",
  },
  {
    seller: luis,
    title: "iPad Air 5th gen with Apple Pencil",
    description:
      "64 GB in blue, Wi-Fi only. Pencil is the second generation. Screen protector on since day one.",
    category: "Computers & Tablets",
    price: { mode: "fixed", cents: 41000 },
    answers: { Condition: "Like new", Brand: "Apple" },
    city: "Austin, TX",
    daysAgo: 1,
    fate: "approved",
  },
  {
    seller: sofia,
    title: "Sonos Beam soundbar, second gen",
    description:
      "Black. Worked great under our old TV, the new one came with its own. Power cable and HDMI included.",
    category: "TVs & Audio",
    price: { mode: "fixed", cents: 24000 },
    answers: { Condition: "Like new", Brand: "Sonos" },
    city: "Franklin, TN",
    daysAgo: 2,
    fate: "approved",
  },
  {
    seller: caleb,
    title: "Sony a6400 with 18-135mm lens",
    description:
      "Shutter count around 9,000. Two batteries, charger, strap and a 64 GB card. No scratches on the lens or sensor.",
    category: "Cameras",
    price: { mode: "fixed", cents: 79000 },
    answers: { Condition: "Like new", Brand: "Sony" },
    city: "Nashville, TN",
    daysAgo: 4,
    fate: "approved",
  },
  {
    seller: darnell,
    title: "PlayStation 5 disc edition, two controllers",
    description:
      "Bought at launch, lives in a ventilated cabinet. Second controller is the red one. Comes with one game.",
    category: "Video Games & Consoles",
    price: { mode: "fixed", cents: 36000 },
    answers: { Condition: "Good", Brand: "Sony" },
    city: "Atlanta, GA",
    daysAgo: 2,
    fate: "approved",
  },
  {
    seller: wyatt,
    title: "Nintendo Switch OLED, white",
    description:
      "Barely used since the kids moved on to other things. Dock, controllers, case and two games included.",
    category: "Video Games & Consoles",
    price: { mode: "negotiable", cents: 24000 },
    answers: { Condition: "Like new", Brand: "Nintendo" },
    city: "Denver, CO",
    daysAgo: 7,
    fate: "approved",
  },
  {
    seller: dana,
    title: "Oak dining table with six chairs",
    description:
      "Seats eight with the leaf in. Table is 72 inches without it. Chairs were reupholstered two years ago. Solid and heavy, bring help.",
    category: "Furniture",
    price: { mode: "negotiable", cents: 65000 },
    answers: {
      Condition: "Good",
      Material: "Wood",
      "Assembly required": false,
    },
    city: "Austin, TX",
    daysAgo: 6,
    fate: "approved",
  },
  {
    seller: luis,
    title: "Standing desk, 60 by 30, bamboo top",
    description:
      "Dual motor frame, goes from 25 to 51 inches. Memory presets work. Top has one ring from a coffee cup.",
    category: "Furniture",
    price: { mode: "fixed", cents: 28000 },
    answers: { Condition: "Good", Material: "Wood", "Assembly required": true },
    city: "Pflugerville, TX",
    daysAgo: 3,
    fate: "approved",
  },
  {
    seller: rachel,
    title: "Glass and steel coffee table",
    description:
      "Tempered glass on a black steel frame, 48 inches long. No chips. Moving to a place with toddlers, so it has to go.",
    category: "Furniture",
    price: { mode: "fixed", cents: 9000 },
    answers: {
      Condition: "Like new",
      Material: "Glass",
      "Assembly required": false,
    },
    city: "Lakewood, CO",
    daysAgo: 1,
    fate: "approved",
  },
  {
    seller: aaliyah,
    title: "Samsung French door refrigerator, stainless",
    description:
      "28 cubic feet with a working ice maker. Five years old. A small dent on the left door. Will help load it.",
    category: "Appliances",
    price: { mode: "fixed", cents: 55000 },
    answers: { Condition: "Good", Brand: "Samsung" },
    city: "Decatur, GA",
    daysAgo: 4,
    fate: "approved",
  },
  {
    seller: tyrone,
    title: "Milwaukee M18 circular saw, tool only",
    description:
      "Brushless 7 1/4 inch. Cut maybe forty boards with it. No battery, I am keeping those.",
    category: "Tools",
    price: { mode: "fixed", cents: 9500 },
    answers: { Condition: "Like new", Brand: "Milwaukee" },
    city: "Denver, CO",
    daysAgo: 9,
    fate: "approved",
  },
  {
    seller: caleb,
    title: "Honda HRX217 self-propelled mower",
    description:
      "Starts on the first or second pull. Blade sharpened this spring. Bag included. Selling because we hired a service.",
    category: "Lawn & Garden",
    price: { mode: "fixed", cents: 32000 },
    answers: { Condition: "Good" },
    city: "Murfreesboro, TN",
    daysAgo: 5,
    fate: "approved",
  },
  {
    seller: sofia,
    title: "Large fiddle leaf fig in a ceramic pot",
    description:
      "About six feet tall and healthy. The pot alone was ninety dollars. It will not fit in the moving truck.",
    category: "Home Decor",
    price: { mode: "fixed", cents: 6000 },
    answers: { Condition: "Good" },
    city: "Nashville, TN",
    daysAgo: 1,
    fate: "approved",
  },
  {
    seller: meiling,
    title: "Patagonia Nano Puff jacket",
    description:
      "Black, worn one season. No tears or stains. From a pet-free home.",
    category: "Women's Clothing",
    price: { mode: "fixed", cents: 8500 },
    answers: { Condition: "Like new", Brand: "Patagonia", Size: "Medium" },
    city: "Seattle, WA",
    daysAgo: 2,
    fate: "approved",
  },
  {
    seller: darnell,
    title: "Allen Edmonds Park Avenue oxfords",
    description:
      "Walnut calf. Resoled once by the factory. Shoe trees included.",
    category: "Shoes",
    price: { mode: "fixed", cents: 12000 },
    answers: { Condition: "Good", Brand: "Allen Edmonds", Size: "10.5 D" },
    city: "Atlanta, GA",
    daysAgo: 6,
    fate: "approved",
  },
  {
    seller: hannah,
    title: "Seiko SKX007 dive watch",
    description:
      "On the original jubilee bracelet with all links. Serviced in 2024. Keeps time within ten seconds a day.",
    category: "Jewelry & Watches",
    price: { mode: "negotiable", cents: 29000 },
    answers: { Condition: "Good", Brand: "Seiko" },
    city: "Nashville, TN",
    daysAgo: 3,
    fate: "approved",
  },
  {
    seller: wyatt,
    title: "Specialized Allez road bike, 56 cm",
    description:
      "Shimano 105, new bar tape and tires. Ridden mostly on the Cherry Creek trail. Pedals not included.",
    category: "Bikes",
    price: { mode: "fixed", cents: 62000 },
    answers: {
      Condition: "Good",
      Brand: "Specialized",
      "Bike type": "Road",
      "Frame size": "56 cm",
    },
    city: "Denver, CO",
    daysAgo: 2,
    fate: "approved",
  },
  {
    seller: luis,
    title: "Rad Power RadRunner electric bike",
    description:
      "About 600 miles on it. Passenger seat and foot pegs installed. Battery still gets 30 miles on a charge.",
    category: "Bikes",
    price: { mode: "fixed", cents: 85000 },
    answers: { Condition: "Good", Brand: "Rad Power", "Bike type": "Electric" },
    city: "Austin, TX",
    daysAgo: 4,
    fate: "approved",
  },
  {
    seller: aaliyah,
    title: "Peloton Bike with shoes and mat",
    description:
      "Original Bike, not the Plus. Screen is perfect. Size 40 shoes, weights and the mat come with it. You will need two people and a truck.",
    category: "Exercise Equipment",
    price: { mode: "negotiable", cents: 70000 },
    answers: { Condition: "Good" },
    city: "Marietta, GA",
    daysAgo: 7,
    fate: "approved",
  },
  {
    seller: caleb,
    title: "REI Half Dome 2 Plus tent",
    description:
      "Used on five trips. Footprint included. No holes, zippers run smooth. Packed dry every time.",
    category: "Camping & Hiking",
    price: { mode: "fixed", cents: 14000 },
    answers: { Condition: "Good" },
    city: "Nashville, TN",
    daysAgo: 2,
    fate: "approved",
  },
  {
    seller: miguel,
    title: "Yeti Tundra 45 cooler",
    description:
      "Tan. A few scuffs from the truck bed. Holds ice for days. Basket included.",
    category: "Camping & Hiking",
    price: { mode: "fixed", cents: 17500 },
    answers: { Condition: "Good" },
    city: "San Marcos, TX",
    daysAgo: 3,
    fate: "approved",
  },
  {
    seller: darnell,
    title: "Two spinning rods with Shimano reels",
    description:
      "Seven foot medium action, spooled with fresh line. Used on Lake Lanier. Tackle box thrown in.",
    category: "Fishing & Hunting",
    price: { mode: "fixed", cents: 11000 },
    answers: { Condition: "Good" },
    city: "Decatur, GA",
    daysAgo: 5,
    fate: "approved",
  },
  {
    seller: rachel,
    title: "Graco 4Ever car seat",
    description:
      "Expires in 2031. Never in an accident. Cover washed and line dried. Manual included.",
    category: "Strollers & Car Seats",
    price: { mode: "fixed", cents: 12000 },
    answers: { Condition: "Good", Brand: "Graco" },
    city: "Aurora, CO",
    daysAgo: 3,
    fate: "approved",
  },
  {
    seller: sofia,
    title: "Wooden train set, over 100 pieces",
    description:
      "Tracks, bridges, a roundhouse and a dozen engines. Comes in a storage bin.",
    category: "Toys",
    price: { mode: "fixed", cents: 4500 },
    answers: { Condition: "Good" },
    city: "Franklin, TN",
    daysAgo: 1,
    fate: "approved",
  },
  {
    seller: aaliyah,
    title: "Crib that converts to a toddler bed",
    description:
      "White, solid wood. Conversion rail and hardware included, mattress is not. Assembly instructions taped to the frame.",
    category: "Kids' Furniture",
    price: { mode: "free" },
    answers: { Condition: "Fair" },
    city: "Atlanta, GA",
    daysAgo: 1,
    fate: "approved",
  },
  {
    seller: miguel,
    title: "Yamaha P-125 digital piano with stand",
    description:
      "88 weighted keys. Includes the furniture stand, three pedal unit and a bench. Everything works.",
    category: "Musical Instruments",
    price: { mode: "fixed", cents: 52000 },
    answers: { Condition: "Like new", Brand: "Yamaha" },
    city: "Round Rock, TX",
    daysAgo: 2,
    fate: "approved",
  },
  {
    seller: meiling,
    title: "Box of 1990s baseball cards",
    description:
      "Roughly 800 cards, mostly 1991 through 1996. A few rookies in sleeves. Not sorted. Selling as one lot.",
    category: "Collectibles",
    price: { mode: "on_request" },
    answers: { Condition: "Good" },
    city: "Bellevue, WA",
    daysAgo: 5,
    fate: "approved",
  },
  {
    seller: hannah,
    title: "Brother sewing machine with table",
    description:
      "CS6000i with all the feet and the extension table. Sews a clean stitch. Comes with a small folding table.",
    category: "Arts & Crafts",
    price: { mode: "range", cents: 9000, maxCents: 12000 },
    answers: { Condition: "Good" },
    city: "Murfreesboro, TN",
    daysAgo: 4,
    fate: "approved",
  },
];
