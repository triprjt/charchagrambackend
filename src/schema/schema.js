import { z } from 'zod';

// Define Zod schemas for nested objects
const surveyScoreSchema = z.object({
  question: z.string().min(1, "Question is required"),
  yes_votes: z.number().min(0, "Yes votes must be non-negative"),
  no_votes: z.number().min(0, "No votes must be non-negative"),
  score: z.number().min(0).max(100, "Score must be between 0 and 100")
});

const deptSurveyScoreSchema = z.object({
  question: z.string().min(1, "Question is required"),
  ratings: z.object({
    "1": z.number().min(0, "1-star rating count must be non-negative"),
    "2": z.number().min(0, "2-star rating count must be non-negative"),
    "3": z.number().min(0, "3-star rating count must be non-negative"),
    "4": z.number().min(0, "4-star rating count must be non-negative"),
    "5": z.number().min(0, "5-star rating count must be non-negative")
  }),
  score: z.number().min(0).max(100, "Score must be between 0 and 100")
});

const metadataSchema = z.object({
  education: z.string().nullable(),
  net_worth: z.string().nullable(),
  criminal_cases: z.number().min(0, "Criminal cases must be non-negative"),
  attendance: z.string().nullable(),
  questions_asked: z.number().min(0, "Questions asked must be non-negative"),
  funds_utilisation: z.string().nullable()
});

const vidhayakInfoSchema = z.object({
  name: z.string().min(1, "Vidhayak name is required"),
  image_url: z.string().url("Image URL must be a valid URL"),
  age: z.number().min(18).max(100, "Age must be between 18 and 100"),
  last_election_vote_percentage: z.string(),
  experience: z.number().min(0).max(50, "Experience must be between 0 and 50 years"),
  party_name: z.string().min(1, "Party name is required"),
  party_icon_url: z.string(),
  manifesto_link: z.string().nullable(),
  manifesto_score: z.number().min(0).max(100, "Manifesto score must be between 0 and 100"),
  metadata: metadataSchema,
  survey_score: z.array(surveyScoreSchema).min(1, "At least one survey question is required")
});

const deptInfoSchema = z.object({
  id: z.string().optional(),
  dept_name: z.string().min(1, "Department name is required"),
  work_info: z.array(z.string()),
  survey_score: z.array(deptSurveyScoreSchema),
  average_score: z.number().min(0).max(100, "Average score must be between 0 and 100")
});

const otherCandidatesSchema = z.object({
  id: z.number().optional(),
  candidate_name: z.string().min(1, "Candidate name is required"),
  candidate_image_url: z.string().url("Candidate image URL must be a valid URL"),
  candidate_party: z.string().min(1, "Candidate party is required"),
  candidate_party_icon_url: z.string().optional(),
  vote_share: z.string().nullable()
});

const latestNewsSchema = z.object({
  title: z.string()
});

// Main constituency schema
const constituencySchema = z.object({
  area_name: z.string().min(1, "Area name is required"),
  vidhayak_info: vidhayakInfoSchema,
  dept_info: z.array(deptInfoSchema).min(1, "At least one department is required"),
  other_candidates: z.array(otherCandidatesSchema).min(1, "At least one other candidate is required"),
  latest_news: z.array(latestNewsSchema)
});

// Array of constituencies schema
const constituencyArraySchema = z.array(constituencySchema).min(1, "At least one constituency is required");

// Export all schemas
export {
  surveyScoreSchema,
  deptSurveyScoreSchema,
  metadataSchema,
  vidhayakInfoSchema,
  deptInfoSchema,
  otherCandidatesSchema,
  latestNewsSchema,
  constituencySchema,
  constituencyArraySchema
};

// Export default schema for convenience
export default constituencyArraySchema;
