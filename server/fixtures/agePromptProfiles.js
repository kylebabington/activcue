// server/fixtures/agePromptProfiles.js
// Fixed profiles for manual / batch age-appropriateness evaluation.

export const AGE_PROMPT_PROFILES = {
  age5: {
    id: "fixture-age-5",
    name: "Jordan",
    birthDate: "2021-03-01",
    ageRange: "3-5",
    interests: "animals, drawing",
    needs: "",
  },
  age8: {
    id: "fixture-age-8",
    name: "Riley",
    birthDate: "2018-01-15",
    ageRange: "6-9",
    interests: "LEGO, outdoor games",
    needs: "",
  },
  age11: {
    id: "fixture-age-11",
    name: "Casey",
    birthDate: "2015-06-20",
    ageRange: "10-12",
    interests: "cooking, science",
    needs: "",
  },
  age13: {
    id: "fixture-age-13",
    name: "Morgan",
    birthDate: "2013-09-14",
    ageRange: "13+",
    interests: "photography, gaming",
    needs: "",
  },
  age16: {
    id: "fixture-age-16",
    name: "Taylor",
    birthDate: "2010-02-10",
    ageRange: "13+",
    interests: "music, fitness",
    needs: "",
  },
};

export const MIXED_AGE_FIXTURE = [
  {
    id: "fixture-mixed-6",
    name: "Avery",
    birthDate: "2020-05-01",
    ageRange: "6-9",
    interests: "animals",
    needs: "",
  },
  {
    id: "fixture-mixed-10",
    name: "Quinn",
    birthDate: "2016-04-12",
    ageRange: "10-12",
    interests: "building",
    needs: "",
  },
  {
    id: "fixture-mixed-14",
    name: "Reese",
    birthDate: "2012-11-03",
    ageRange: "13+",
    interests: "design, video",
    needs: "",
  },
];

export const AGE_EVAL_CHECKLIST = [
  "Does it feel childish for the oldest participant?",
  "Is the language age-appropriate?",
  "Is it too difficult for the youngest?",
  "Is it merely a renamed preschool activity?",
  "Does each child have a meaningful role?",
  "Could the child start without adult interpretation?",
  "For age 10+: does the activity ask the child to reason, not just make?",
  "For age 10+: is there a meaningful question or problem?",
  "For age 10+: does the child gather or use evidence?",
  "For age 10+: does it require prediction, comparison, testing, or explanation?",
  "Does a science activity contain actual scientific reasoning?",
  "Does engineering include constraints and testing?",
  "Does history include causes, evidence, perspectives, or consequences?",
  "Could the activity be described as authentic inquiry instead of themed pretend play?",
  "For age 13+: would a teenager feel patronized by this?",
  "For age 13+: is the challenge intellectually substantive?",
  "For age 13+: does it require analysis or iteration?",
  "For age 13+: is fictional framing justified by the child's interests?",
];
