export interface Guide {
  slug: string;
  title: string;
  summary: string;
  /** Item ids for the five practice questions at the end of the guide. */
  questions: string[];
}

export const GUIDES: Guide[] = [
  {
    slug: "how-the-life-in-the-uk-test-works",
    title: "How the Life in the UK test works",
    summary: "Who needs it, the format, the pass mark and how questions are asked.",
    questions: [
      "c2_uk_countries_single_a",
      "c1_principles_multi_a",
      "c5_general_election_single_a",
      "c4_patron_wales_single_a",
      "c3_hastings_single_a",
    ],
  },
  {
    slug: "what-to-bring-on-test-day",
    title: "What to bring on test day",
    summary: "ID, timing and what happens at the test centre, with the official links to check.",
    questions: [
      "c1_settle_requirements_single_a",
      "c1_ceremony_single_a",
      "c5_who_can_vote_multi_a",
      "c5_electoral_register_single_a",
      "c2_westminster_single_a",
    ],
  },
  {
    slug: "key-dates-to-learn",
    title: "Key dates to learn",
    summary: "The dates that come up most in the history chapter, in order, on one page.",
    questions: [
      "c3_magna_carta_single_a",
      "c3_armada_date_single_b",
      "c3_great_fire_single_a",
      "c3_union_1707_single_a",
      "c3_women_vote_1928_single_b",
    ],
  },
  {
    slug: "four-week-revision-plan",
    title: "A 4-week revision plan",
    summary: "What to study each week, how long each day, and when to start mock exams.",
    questions: [
      "c4_capital_wales_single_a",
      "c5_jury_size_single_a",
      "c3_bannockburn_single_a",
      "c4_christmas_single_a",
      "c1_freedoms_multi_a",
    ],
  },
  {
    slug: "commonly-confused-facts",
    title: "Facts people mix up most",
    summary: "Great Britain vs the UK, 1665 vs 1666, Cavaliers vs Roundheads and other easy-to-swap pairs.",
    questions: [
      "c2_great_britain_single_a",
      "c3_great_plague_single_a",
      "c3_civil_war_single_a",
      "c5_jury_scotland_single_b",
      "c3_slavery_abolished_single_b",
    ],
  },
];
