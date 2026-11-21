import "server-only";
import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

// GeoJSON, longitude first.
const pointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

// US cities and ZIP codes, loaded once from Census data and never edited.
// A ZIP carries the city it falls in, so it can be shown as a place name.
const schema = new Schema({
  kind: { type: String, enum: ["city", "zip"], required: true },
  // What a search is matched against: the lowercased city name, or the ZIP.
  key: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: String,
  population: { type: Number, required: true },
  // Cities only: the city as a circle of the same land area.
  radiusMiles: Number,
  point: { type: pointSchema, required: true },
});

schema.index({ kind: 1, key: 1, population: -1 });
schema.index({ point: "2dsphere" });

export type PlaceFields = InferSchemaType<typeof schema>;
export const Place: Model<PlaceFields> =
  mongoose.models.Place ?? mongoose.model("Place", schema);
