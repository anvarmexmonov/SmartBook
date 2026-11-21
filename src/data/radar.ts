/* Demo cohort data for the Learning Radar. Numbers are invented for illustration. */
export interface ChapterStat {
  chapter: string
  opened: number // % of students who opened the chapter
  completed: number // % who finished the reading activity
  understood: number // % who scored ≥ 70% on the chapter exercises
  quizAvg: number // average quiz score, %
  aiRequests: number
}

export interface Course {
  id: string
  name: string
  group: string
  students: number
  bookId: string
  week: number
  stats: ChapterStat[]
  difficult: { topic: string; section: string; correct: number; attempts: number }[]
  hotspots: { passage: string; section: string; requests: number }[]
  actions: { id: string; text: string; reason: string }[]
}

export const COURSES: Course[] = [
  {
    id: 'civ-1',
    name: 'Civil Law I',
    group: 'Group 2-03 · Autumn 2026',
    students: 62,
    bookId: 'civil-law-fundamentals',
    week: 9,
    stats: [
      { chapter: 'Ch. 1 Sources', opened: 100, completed: 94, understood: 85, quizAvg: 84, aiRequests: 31 },
      { chapter: 'Ch. 2 Persons', opened: 98, completed: 89, understood: 77, quizAvg: 79, aiRequests: 52 },
      { chapter: 'Ch. 3 Obligations', opened: 95, completed: 82, understood: 71, quizAvg: 74, aiRequests: 47 },
      { chapter: 'Ch. 4 Contracts', opened: 87, completed: 63, understood: 44, quizAvg: 58, aiRequests: 214 },
      { chapter: 'Ch. 5 Invalidity', opened: 41, completed: 18, understood: 11, quizAvg: 66, aiRequests: 19 },
    ],
    difficult: [
      { topic: 'Counter-offer vs. acceptance', section: '4.3', correct: 41, attempts: 58 },
      { topic: 'Terms on which a party insists', section: '4.2', correct: 52, attempts: 60 },
      { topic: 'Acceptance by conduct', section: '4.4 · Case study', correct: 57, attempts: 49 },
      { topic: 'Grounds for obligations', section: '3.1', correct: 81, attempts: 61 },
    ],
    hotspots: [
      { passage: '“A reply that agrees ‘in principle’ but changes the price…”', section: '4.3', requests: 96 },
      { passage: '“Silence counts as acceptance only where this follows from law…”', section: '4.3', requests: 58 },
      { passage: '“Terms on which one party insists…”', section: '4.2', requests: 41 },
    ],
    actions: [
      { id: 'a1', text: 'Open Thursday’s seminar with two counter-offer scenarios', reason: '41% correct on 4.3, and the passage is the most explained in the book.' },
      { id: 'a2', text: 'Add a worked example to section 4.2 on insisted terms', reason: 'Students open the section but half answer the exercise incorrectly.' },
      { id: 'a3', text: 'Remind the group that Chapter 5 is due next week', reason: 'Only 41% have opened it so far.' },
    ],
  },
  {
    id: 'bus-3',
    name: 'Business Contracts',
    group: 'Group 3-11 · Autumn 2026',
    students: 48,
    bookId: 'business-contract-law',
    week: 9,
    stats: [
      { chapter: 'Ch. 1 Legal forms', opened: 100, completed: 96, understood: 88, quizAvg: 86, aiRequests: 22 },
      { chapter: 'Ch. 2 Supply & sale', opened: 96, completed: 85, understood: 69, quizAvg: 71, aiRequests: 88 },
      { chapter: 'Ch. 3 Lease & services', opened: 79, completed: 60, understood: 52, quizAvg: 64, aiRequests: 63 },
      { chapter: 'Ch. 4 Securing perf.', opened: 35, completed: 12, understood: 8, quizAvg: 61, aiRequests: 14 },
    ],
    difficult: [
      { topic: 'Penalty vs. damages', section: '4.1', correct: 46, attempts: 17 },
      { topic: 'Risk of accidental loss', section: '2.3', correct: 55, attempts: 44 },
      { topic: 'Lease of buildings — form', section: '3.2', correct: 61, attempts: 38 },
    ],
    hotspots: [
      { passage: '“The risk of accidental loss passes to the buyer…”', section: '2.3', requests: 51 },
      { passage: '“A lease of a building concluded for more than one year…”', section: '3.2', requests: 33 },
    ],
    actions: [
      { id: 'b1', text: 'Assign the supply-contract drafting exercise in pairs', reason: 'Understanding drops 16 points between reading and exercises in Ch. 2.' },
      { id: 'b2', text: 'Record a 5-minute note on risk of loss', reason: 'Most AI explanation requests in this book.' },
    ],
  },
  {
    id: 'con-2',
    name: 'Constitutional Law',
    group: 'Group 1-07 · Autumn 2026',
    students: 71,
    bookId: 'constitutional-law-uz',
    week: 9,
    stats: [
      { chapter: 'Ch. 1 Supremacy', opened: 99, completed: 93, understood: 86, quizAvg: 85, aiRequests: 18 },
      { chapter: 'Ch. 2 Rights', opened: 97, completed: 88, understood: 80, quizAvg: 81, aiRequests: 40 },
      { chapter: 'Ch. 3 Oliy Majlis', opened: 90, completed: 74, understood: 62, quizAvg: 69, aiRequests: 57 },
      { chapter: 'Ch. 4 President', opened: 52, completed: 30, understood: 22, quizAvg: 72, aiRequests: 12 },
    ],
    difficult: [
      { topic: 'Legislative procedure', section: '3.4', correct: 49, attempts: 63 },
      { topic: 'Powers of the Senate', section: '3.2', correct: 58, attempts: 64 },
    ],
    hotspots: [{ passage: '“A law adopted by the Legislative Chamber is sent to the Senate…”', section: '3.4', requests: 44 }],
    actions: [{ id: 'k1', text: 'Draw the legislative procedure as a flowchart in class', reason: 'Lowest exercise result in the course so far.' }],
  },
]
