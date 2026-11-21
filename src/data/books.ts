import type { Book, Chapter } from './types'
import { BIZ_CH1, CLF_CH3, CLF_CH4, CONST_CH1, CRIM_CH1, HR_CH1, LRW_CH1 } from './content'

export const PROFESSOR_ID = 'prof-rakhimova'
export const PROFESSOR_NAME = 'Prof. Dilnoza Rakhimova'

const ch = (id: string, title: string, minutes: number, blocks?: Chapter['blocks']): Chapter => ({
  id,
  title,
  minutes,
  blocks,
})

/* All books, authors and institutions below are fictional demo content. */
export const BOOKS: Book[] = [
  {
    id: 'civil-law-fundamentals',
    title: 'Civil Law Fundamentals',
    subtitle: 'Persons, Obligations and Contracts',
    author: PROFESSOR_NAME,
    authorRole: 'Department of Civil Law',
    category: 'Civil Law',
    year: 2026,
    pages: 412,
    edition: '3rd edition',
    description:
      'A structured introduction to the general part of civil law of Uzbekistan: legal capacity, transactions, the law of obligations and the formation of contracts. Each chapter combines doctrine with short practical cases, exercises and linked references to the Civil Code.',
    cover: { palette: 'forest', motif: 'frame' },
    ownerId: PROFESSOR_ID,
    status: 'published',
    tags: ['contracts', 'obligations', 'first-year'],
    chapters: [
      ch('clf-1', 'Subject and Sources of Civil Law', 22),
      ch('clf-2', 'Persons: Capacity and Legal Entities', 28),
      ch('clf-3', 'Obligations and Their Performance', 18, CLF_CH3),
      ch('clf-4', 'Formation of Contracts', 34, CLF_CH4),
      ch('clf-5', 'Invalid Transactions', 26),
      ch('clf-6', 'Liability for Breach of Obligations', 30),
      ch('clf-7', 'Limitation Periods', 16),
    ],
  },
  {
    id: 'constitutional-law-uz',
    title: 'Constitutional Law of Uzbekistan',
    subtitle: 'Foundations, Rights and State Institutions',
    author: 'Prof. Bakhtiyor Usmonov',
    authorRole: 'Department of Constitutional Law',
    category: 'Constitutional Law',
    year: 2025,
    pages: 368,
    edition: '2nd edition',
    description:
      'A clear account of the constitutional order: the supremacy of the Constitution, human rights and freedoms, the separation of powers, the judiciary and local self-government. Written for second-year students and those preparing for state examinations.',
    cover: { palette: 'navy', motif: 'seal' },
    status: 'published',
    chapters: [
      ch('con-1', 'The Constitution as Supreme Law', 20, CONST_CH1),
      ch('con-2', 'Human Rights and Freedoms', 32),
      ch('con-3', 'The Oliy Majlis', 26),
      ch('con-4', 'The President and the Government', 24),
      ch('con-5', 'Judicial Power and the Constitutional Court', 28),
      ch('con-6', 'Local Self-Government', 18),
    ],
  },
  {
    id: 'criminal-procedure',
    title: 'Introduction to Criminal Procedure',
    author: 'Dr. Sherzod Karimov',
    authorRole: 'Department of Criminal Procedure',
    category: 'Criminal Law',
    year: 2025,
    pages: 296,
    description:
      'The stages of criminal proceedings from the initiation of a case to the appeal of a verdict, with emphasis on procedural guarantees, evidence and the role of defence counsel.',
    cover: { palette: 'wine', motif: 'column' },
    status: 'published',
    chapters: [
      ch('crp-1', 'Principles of Criminal Procedure', 24, CRIM_CH1),
      ch('crp-2', 'Participants in Proceedings', 22),
      ch('crp-3', 'Evidence and Proof', 30),
      ch('crp-4', 'Pre-Trial Investigation', 28),
      ch('crp-5', 'Trial and Verdict', 26),
    ],
  },
  {
    id: 'business-contract-law',
    title: 'Business and Contract Law',
    subtitle: 'A Practitioner’s Introduction',
    author: PROFESSOR_NAME,
    authorRole: 'Department of Civil Law',
    category: 'Business Law',
    year: 2026,
    pages: 344,
    description:
      'Legal forms of business, commercial contracts and dispute resolution for students who plan to advise companies. Includes drafting exercises for supply, lease and service agreements.',
    cover: { palette: 'ochre', motif: 'band' },
    ownerId: PROFESSOR_ID,
    status: 'published',
    tags: ['contracts', 'business'],
    chapters: [
      ch('bcl-1', 'Legal Forms of Business', 20, BIZ_CH1),
      ch('bcl-2', 'Commercial Contracts: Supply and Sale', 30),
      ch('bcl-3', 'Lease and Services', 24),
      ch('bcl-4', 'Securing Performance', 26),
      ch('bcl-5', 'Commercial Disputes and Arbitration', 22),
    ],
  },
  {
    id: 'international-human-rights',
    title: 'International Human Rights Law',
    author: 'Dr. Malika Yusupova',
    authorRole: 'Department of International Law',
    category: 'International Law',
    year: 2024,
    pages: 320,
    description:
      'The universal and regional systems for the protection of human rights, the obligations of states under the main treaties, and the mechanisms through which individuals can seek remedies.',
    cover: { palette: 'teal', motif: 'grid' },
    status: 'published',
    chapters: [
      ch('ihr-1', 'Origins and Nature of Human Rights', 22, HR_CH1),
      ch('ihr-2', 'The UN Treaty System', 28),
      ch('ihr-3', 'Civil and Political Rights', 26),
      ch('ihr-4', 'Economic, Social and Cultural Rights', 24),
    ],
  },
  {
    id: 'legal-research-writing',
    title: 'Legal Research and Writing',
    author: 'Dr. Nodira Islomova',
    authorRole: 'Legal Clinic',
    category: 'Legal Skills',
    year: 2026,
    pages: 212,
    description:
      'How to find, read and cite legal sources, and how to turn analysis into clear memoranda, opinions and court submissions. A practical companion for every year of study.',
    cover: { palette: 'linen', motif: 'rule' },
    status: 'published',
    chapters: [
      ch('lrw-1', 'Thinking Like a Lawyer: IRAC', 16, LRW_CH1),
      ch('lrw-2', 'Working with Lex.uz and Court Practice', 20),
      ch('lrw-3', 'Writing a Legal Memorandum', 24),
      ch('lrw-4', 'Citation and Style', 14),
    ],
  },
  {
    id: 'public-international-law',
    title: 'Public International Law',
    subtitle: 'A Primer',
    author: 'Dr. Malika Yusupova',
    authorRole: 'Department of International Law',
    category: 'International Law',
    year: 2023,
    pages: 276,
    description:
      'Sources of international law, the law of treaties, state responsibility and the peaceful settlement of disputes, explained for students meeting the subject for the first time.',
    cover: { palette: 'slate', motif: 'frame' },
    status: 'published',
    chapters: [
      ch('pil-1', 'Sources of International Law', 22),
      ch('pil-2', 'The Law of Treaties', 26),
      ch('pil-3', 'State Responsibility', 24),
    ],
  },
  {
    id: 'criminal-law-general',
    title: 'Criminal Law: General Part',
    author: 'Prof. Ulugbek Mirzaev',
    authorRole: 'Department of Criminal Law',
    category: 'Criminal Law',
    year: 2024,
    pages: 388,
    description:
      'The concept of crime, the elements of an offence, forms of guilt, complicity and the system of punishments, with commentary on judicial practice.',
    cover: { palette: 'plum', motif: 'band' },
    status: 'published',
    chapters: [
      ch('clg-1', 'Concept and Tasks of Criminal Law', 18),
      ch('clg-2', 'Elements of a Crime', 30),
      ch('clg-3', 'Guilt and Its Forms', 24),
      ch('clg-4', 'Punishment', 26),
    ],
  },
  {
    id: 'corporate-governance',
    title: 'Corporate Governance',
    subtitle: 'Companies, Shareholders and Boards',
    author: 'Dr. Jasur Toshmatov',
    authorRole: 'Department of Business Law',
    category: 'Business Law',
    year: 2025,
    pages: 254,
    description:
      'How joint-stock companies and LLCs are managed: general meetings, supervisory boards, executive bodies, minority shareholder protection and disclosure duties.',
    cover: { palette: 'forest', motif: 'grid' },
    status: 'published',
    chapters: [
      ch('cg-1', 'The Company as a Legal Person', 20),
      ch('cg-2', 'Shareholders and Their Rights', 24),
      ch('cg-3', 'Boards and Executives', 26),
    ],
  },
]

/* Draft that lives only in Professor Studio until published */
export const SEED_DRAFT: Book = {
  id: 'obligations-workbook',
  title: 'Law of Obligations',
  subtitle: 'Case Workbook',
  author: PROFESSOR_NAME,
  authorRole: 'Department of Civil Law',
  category: 'Civil Law',
  year: 2026,
  pages: 96,
  description: 'Short practical cases on performance, breach and remedies, designed to accompany Civil Law Fundamentals.',
  cover: { palette: 'wine', motif: 'rule' },
  ownerId: PROFESSOR_ID,
  status: 'draft',
  chapters: [
    {
      id: 'ow-1',
      title: 'Late Performance',
      minutes: 12,
      blocks: [
        {
          id: 'ow1-p1',
          type: 'p',
          text: 'Each case in this workbook begins with facts drawn from typical commercial situations. Read the facts carefully, identify the obligation in question, and decide which remedy the creditor may use.',
        },
        {
          id: 'ow1-case',
          type: 'case',
          title: 'Case 1: The delayed harvest equipment',
          facts:
            'A supplier promised to deliver irrigation pumps by 1 April. The pumps arrived on 20 April, after the sowing season had begun. The farm refused to accept them.',
          question: 'Could the farm refuse the late delivery?',
          analysis:
            'If, because of the delay, performance lost its interest for the creditor, the creditor may refuse to accept it and claim compensation for losses. The farm must show that the pumps were needed specifically for the sowing season.',
        },
      ],
    },
  ],
}
