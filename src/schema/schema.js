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
  education: z.string().min(1, "Education is required"),
  net_worth: z.string().min(1, "Net worth is required"),
  criminal_cases: z.number().min(0, "Criminal cases must be non-negative"),
  attendance: z.string().regex(/^\d+(\.\d+)?%$/, "Attendance must be in percentage format (e.g., '85%')"),
  questions_asked: z.number().min(0, "Questions asked must be non-negative"),
  funds_utilisation: z.string().regex(/^\d+(\.\d+)?%$/, "Funds utilisation must be in percentage format (e.g., '90%')")
});

const vidhayakInfoSchema = z.object({
  name: z.string().min(1, "Vidhayak name is required"),
  image_url: z.string().url("Image URL must be a valid URL"),
  age: z.number().min(18).max(100, "Age must be between 18 and 100"),
  last_election_vote_percentage: z.string().regex(/^\d+(\.\d+)?%$/, "Vote percentage must be in percentage format (e.g., '52.3%')"),
  experience: z.number().min(0).max(50, "Experience must be between 0 and 50 years"),
  party_name: z.enum(['BJP', 'Congress', 'AAP', 'Shiv Sena', 'NCP', 'MNS', 'Samajwadi Party', 'BSP', 'TMC', 'DMK', 'AIADMK', 'RJD', 'JDU'], {
    errorMap: () => ({ message: "Party name must be one of the valid parties" })
  }),
  party_icon_url: z.string().url("Party icon URL must be a valid URL"),
  manifesto_link: z.string().url("Manifesto link must be a valid URL"),
  manifesto_score: z.number().min(0).max(100, "Manifesto score must be between 0 and 100"),
  metadata: metadataSchema,
  survey_score: z.array(surveyScoreSchema).min(1, "At least one survey question is required")
});

const deptInfoSchema = z.object({
  id: z.string().optional(),
  dept_name: z.string().min(1, "Department name is required"),
  work_info: z.array(z.string().min(1, "Work info item cannot be empty")).min(1, "At least one work info item is required"),
  survey_score: z.array(deptSurveyScoreSchema).min(1, "At least one survey question is required"),
  average_score: z.number().min(0).max(100, "Average score must be between 0 and 100")
});

const otherCandidatesSchema = z.object({
  id: z.number().optional(),
  candidate_name: z.string().min(1, "Candidate name is required"),
  candidate_image_url: z.string().url("Candidate image URL must be a valid URL"),
  candidate_party: z.enum(['BJP', 'Congress', 'AAP', 'Shiv Sena', 'NCP', 'MNS', 'Samajwadi Party', 'BSP', 'TMC', 'DMK', 'AIADMK', 'RJD', 'JDU'], {
    errorMap: () => ({ message: "Candidate party must be one of the valid parties" })
  }),
  vote_share: z.string().regex(/^\d+(\.\d+)?%$/, "Vote share must be in percentage format (e.g., '18.2%')")
});

const latestNewsSchema = z.object({
  title: z.string().min(1, "News title is required")
});

// Main constituency schema
const constituencySchema = z.object({
  area_name: z.string().min(1, "Area name is required"),
  vidhayak_info: vidhayakInfoSchema,
  dept_info: z.array(deptInfoSchema).min(1, "At least one department is required"),
  other_candidates: z.array(otherCandidatesSchema).min(1, "At least one other candidate is required"),
  latest_news: z.array(latestNewsSchema).min(1, "At least one news item is required")
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
