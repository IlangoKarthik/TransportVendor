const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Field mappings from PostgreSQL schema
  name: {  // field_1
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  transportName: {  // field_0
    type: String,
    trim: true
  },
  city: {  // field_2
    type: String,
    trim: true
  },
  state: {  // field_3
    type: String,
    trim: true
  },
  visitingCard: {  // field_4
    type: String,
    trim: true
  },
  vehicleType: {  // field_5
    type: String,
    trim: true
  },
  mainServiceCity: {  // field_6
    type: String,
    trim: true
  },
  ownerBroker: {  // field_7
    type: String,
    trim: true
  },
  whatsappNumber: {  // field_8
    type: String,
    trim: true
  },
  alternateNumber: {  // field_9
    type: String,
    trim: true
  },
  mainServiceState: {  // field_10
    type: String,
    trim: true
  },
  returnService: {  // field_11
    type: String,
    enum: ['YES', 'NO', 'Yes', 'No', 'Y', 'N', ''],
    default: ''
  },
  anyAssociation: {  // field_12
    type: String,
    trim: true
  },
  associationName: {  // field_13
    type: String,
    trim: true
  },
  verification: {  // field_14
    type: String,
    trim: true
  },
  notes: [{  // field_15 - Array of timestamped notes
    comment: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
  // NOTE: Embeddings are NOT stored in MongoDB
  // Flask db_search service generates and caches its own embeddings
  // in db_search/data/users/{userId}/embeddings/vendor_embeddings.pkl
}, {
  timestamps: true
});

// Index for search performance
vendorSchema.index({ name: 'text', transportName: 'text', city: 'text', state: 'text', visitingCard: 'text' });
vendorSchema.index({ userId: 1, createdAt: -1 });
vendorSchema.index({ returnService: 1 });
vendorSchema.index({ verification: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
