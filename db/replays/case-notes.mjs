// Plain descriptions of the test cases behind the public replays, written by hand for readers who have never seen
// CrossSignal. They state the planted answer, so they sit beside the recordings (which already quote the answer key)
// and nothing on the model's path imports them. tests/replay-story.test.mjs recomputes every number from the case file.
export const CASE_NOTES = Object.freeze({
  // B17: tests/evaluator/b16-b20/generate.mjs:71-72 plants the fault.
  c_5270474566d4: Object.freeze({
    title: 'An AI investigator looks into a 20% revenue drop',
    test: 'This is a test, not a live incident. The traffic and sales come from a real online store\'s public sample data '
      + 'from 2020. The fault, the software updates and the health readings were planted, so the right answer is known.',
    wentWrong: [
      'Revenue fell 20% in a week, from $6,691 a day to $5,352. All of the fall was on mobile: $2,994 a day became $950, '
        + 'while desktop rose. ',
      { strong: 'The planted fault:' },
      ' after a checkout update on Dec 2, 60% fewer mobile shoppers finished their orders.',
    ],
  }),
});
