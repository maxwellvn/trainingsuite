
import mongoose from 'mongoose';

const idOrSlug = "crusade-planning-fundamentals";
const isValid = mongoose.Types.ObjectId.isValid(idOrSlug);
console.log(`Is "${idOrSlug}" a valid ObjectId? ${isValid}`);

if (isValid) {
  console.log("Would call findById");
} else {
  console.log("Would call findOne({ slug: ... })");
}
