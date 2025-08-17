import mongoose from 'mongoose';

// Define valid party names
const VALID_PARTIES = [
  'BJP', 'Congress', 'AAP', 'Shiv Sena', 'NCP', 'MNS', 
  'Samajwadi Party', 'BSP', 'TMC', 'DMK', 'AIADMK', 'RJD', 'JDU'
];

// Survey score schema
const surveyScoreSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  yes_votes: {
    type: Number,
    required: true,
    min: 0
  },
  no_votes: {
    type: Number,
    required: true,
    min: 0
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  }
}, { _id: false });

const deptSurveyScoreSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  ratings: {
    "1": { type: Number, default: 0, min: 0 }, // 1 star
    "2": { type: Number, default: 0, min: 0 }, // 2 stars
    "3": { type: Number, default: 0, min: 0 }, // 3 stars
    "4": { type: Number, default: 0, min: 0 }, // 4 stars
    "5": { type: Number, default: 0, min: 0 }  // 5 stars
  },
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, { _id: false });
// Department info schema
const deptInfoSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // UUID validation will be handled at the application level
        return true;
      },
      message: props => `${props.value} is not a valid UUID!`
    }
  },
  dept_name: {
    type: String,
    required: true,
    trim: true
  },
  work_info: [{
    type: String,
    trim: true
  }],
  survey_score: [deptSurveyScoreSchema],
  average_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, { _id: false });


// Other candidates schema
const otherCandidatesSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    min: 1
  },
  candidate_name: {
    type: String,
    required: true,
    trim: true
  },
  candidate_image_url: {
    type: String,
    required: true,
    trim: true,
    match: /^https?:\/\/.+/, // Must be a valid URL
    message: 'Candidate image URL must be a valid HTTP/HTTPS URL'
  },
  candidate_party: {
    type: String,
    required: true,
    enum: VALID_PARTIES,
    message: props => `${props.value} is not a valid party name!`
  },
  vote_share: {
    type: String,
    required: true,
    match: /^\d+(\.\d+)?%$/, // Format: "35.6%"
    message: 'Vote share must be in percentage format (e.g., "35.6%")'
  }
}, { _id: false });

// Latest news schema
const latestNewsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

// Main constituency schema
const constituencySchema = new mongoose.Schema({
  area_name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  vidhayak_info: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    image_url: {
      type: String,
      required: true,
      trim: true,
      match: /^https?:\/\/.+/, // Must be a valid URL
      message: 'Image URL must be a valid HTTP/HTTPS URL'
    },
    age: {
      type: Number,
      required: true,
      min: 18,
      max: 100
    },
    last_election_vote_percentage: {
      type: String,
      required: true,
      match: /^\d+(\.\d+)?%$/, // Format: "52.3%"
      message: 'Vote percentage must be in percentage format (e.g., "52.3%")'
    },
    experience: {
      type: Number,
      required: true,
      min: 0,
      max: 50
    },
    party_name: {
      type: String,
      required: true,
      enum: VALID_PARTIES,
      message: props => `${props.value} is not a valid party name!`
    },
    party_icon_url: {
      type: String,
      required: true,
      trim: true,
      match: /^https?:\/\/.+/, // Must be a valid URL
      message: 'Party icon URL must be a valid HTTP/HTTPS URL'
    },
    manifesto_link: {
      type: String,
      required: true,
      trim: true,
      match: /^https?:\/\/.+/, // Must be a valid URL
      message: 'Manifesto link must be a valid HTTP/HTTPS URL'
    },
    manifesto_score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    metadata: {
      education: {
        type: String,
        required: true,
        trim: true
      },
      net_worth: {
        type: String,
        required: true,
        trim: true
      },
      criminal_cases: {
        type: Number,
        required: true,
        min: 0
      },
      attendance: {
        type: String,
        required: true,
        match: /^\d+(\.\d+)?%$/, // Format: "85%"
        message: 'Attendance must be in percentage format (e.g., "85%")'
      },
      questions_asked: {
        type: Number,
        required: true,
        min: 0
      },
      funds_utilisation: {
        type: String,
        required: true,
        match: /^\d+(\.\d+)?%$/, // Format: "90%"
        message: 'Funds utilisation must be in percentage format (e.g., "90%")'
      }
    },
    survey_score: [surveyScoreSchema]
  },
  dept_info: [deptInfoSchema],
  other_candidates: [otherCandidatesSchema],
  latest_news: [latestNewsSchema]
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  collection: 'constituencies'
});

// Create index on area_name for fast querying
constituencySchema.index({ area_name: 1 });

// Pre-save middleware to ensure unique IDs in dept_info
constituencySchema.pre('save', function(next) {
  if (this.dept_info && this.dept_info.length > 0) {
    const ids = this.dept_info.map(dept => dept.id);
    const uniqueIds = new Set(ids);
    
    if (ids.length !== uniqueIds.size) {
      return next(new Error('Department IDs must be unique within a constituency'));
    }
  }
  next();
});

// Static method to get all constituency names
constituencySchema.statics.getAllAreaNames = function() {
  return this.find({}, 'area_name').sort({ area_name: 1 });
};

// Static method to get constituency by area name
constituencySchema.statics.findByAreaName = function(areaName) {
  return this.findOne({ area_name: areaName });
};

export default mongoose.model('Constituency', constituencySchema);
