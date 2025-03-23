import mongoose from "mongoose";

const IngredientsSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
	unique: true,
        trim: true,
    },
    source: {
        type: String,
        required: true,
        enum: ['plant-based', 'animal-based', 'synthetic'],
        trim: true,
    },
    function: {
        type: String,
        required: true,
        trim: true,
        enum: ['flavouring','Leavening agent', 'preservative', 'colouring', 'emulsifier', 'sweetener', 'thickener', 'stabiliser', 'raising agent', 'acidity regulator', 'antioxidant', 'humectant', 'bulking agent', 'glazing agent', 'firming agent', 'gelling agent', 'flour treatment agent', 'packaging gas', 'propellant', 'sequestrant','enhance texture'],
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    isAllergen: {
        type: Boolean,
        default:false,
        required: true,
    },
    allergies: {
        type: [String],
        default: [],
        required: function() {
            return this.isAllergen;
        },
    },
    isVegan: {
        type: Boolean,
        default:false,
        required: true,
    },
    isPregnantSafe: {
        type: Boolean,
        default:false,
        required: true,
    },
    ageRestriction: {
        type: Number,
        required: true,
    },
    isAddictive: {
        type: Boolean,
        default:false,
        required: true,
    },
    harmLevel:{
	type: Number,
	required: true,
	enum: [0,1,2,3],
}

    
},{
    timestamps: true,
})

IngredientsSchema.pre('save', function(next) {
    if (this.allergies && Array.isArray(this.allergies)) {
      this.allergies = this.allergies.map(a => a.trim());
    }
    next();
});

export const Ingredients = mongoose.model('Ingredients', IngredientsSchema);
