import type { Block } from './types'

/* Civil Law Fundamentals — Chapter 4: Formation of Contracts (the flagship demo chapter) */
export const CLF_CH4: Block[] = [
  {
    id: 'c4-intro',
    type: 'p',
    text: 'Almost every economic relationship in a modern society rests on a contract. A student renting a flat near the university, a farmer selling cotton to a processing plant, a software company licensing its code — each of them relies on the same legal mechanism: two wills meeting and producing obligations that the law will enforce. This chapter explains how that meeting of wills happens, at what moment a contract comes into existence, and why the details of formation matter so much in practice.',
  },
  {
    id: 'c4-intro2',
    type: 'p',
    text: 'The Civil Code of the Republic of Uzbekistan treats the contract as a species of transaction: a lawful action aimed at creating, changing or ending civil rights and obligations. What makes a contract special is that it always requires at least two parties whose declarations of will coincide.',
  },
  {
    id: 'c4-lex-353',
    type: 'lex',
    refId: 'cc-353',
    act: 'Civil Code',
    article: 'Art. 353',
    title: 'Concept of a contract',
    excerpt:
      'A contract is an agreement of two or more persons on the establishment, modification or termination of civil rights and obligations.',
  },
  { id: 'c4-h-1', type: 'h2', text: '4.1 Freedom of contract and its limits' },
  {
    id: 'c4-p-1',
    type: 'p',
    text: 'The starting point of contract law is **freedom of contract**. It has three dimensions: the freedom to decide *whether* to enter into a contract at all, the freedom to choose *with whom* to contract, and the freedom to determine *the content* of the agreement. Parties may even conclude contracts that the Code does not name, or combine elements of several contract types into one mixed contract.',
  },
  {
    id: 'c4-p-2',
    type: 'p',
    text: 'Freedom, however, is never absolute. The parties cannot agree on terms that contradict mandatory rules of law, and in some situations the law itself obliges a party to conclude a contract. A public contract — for example, the supply of electricity or retail trade — must be concluded with anyone who applies, on equal terms for all consumers of the same category.',
  },
  {
    id: 'c4-quote-1',
    type: 'quote',
    text: 'Freedom of contract does not mean freedom from law; it means freedom within it. The legislator sets the frame, and the parties paint the picture.',
    source: 'From a lecture on the law of obligations (demo citation)',
  },
  {
    id: 'c4-lex-354',
    type: 'lex',
    refId: 'cc-354',
    act: 'Civil Code',
    article: 'Art. 354',
    title: 'Freedom of contract',
    excerpt:
      'Compulsion to conclude a contract is not permitted, except where the obligation is provided for by the Code, by law or by a voluntarily assumed obligation.',
  },
  { id: 'c4-h-2', type: 'h2', text: '4.2 Essential terms' },
  {
    id: 'c4-p-3',
    type: 'p',
    text: 'A contract is concluded only when the parties have reached agreement on all of its **essential terms**. If even one essential term remains open, the law treats the contract as not concluded: there is simply nothing to enforce. Three groups of terms are considered essential:',
  },
  {
    id: 'c4-list-1',
    type: 'list',
    items: [
      '**The subject of the contract** — what exactly is being sold, performed or transferred. Without a subject, no contract can exist.',
      '**Terms named as essential by law** — for example, the price of real estate in a sale contract, or the period of a lease where the law requires it.',
      '**Terms on which one party insists** — any condition that one party has declared necessary becomes essential for that particular contract.',
    ],
  },
  {
    id: 'c4-fig-2',
    type: 'figure',
    figure: 'essentials',
    caption: 'Figure 4.1. Three sources of essential terms. Agreement on every circle is required before the contract is concluded.',
  },
  {
    id: 'c4-p-4',
    type: 'p',
    text: 'Other terms are called *ordinary* or *default* terms. They apply automatically because the law supplies them, even if the parties never discussed them — for instance, the rules on the place of performance. Parties may change default terms, but they do not need to agree on them to create a binding contract.',
  },
  {
    id: 'c4-lex-364',
    type: 'lex',
    refId: 'cc-364',
    act: 'Civil Code',
    article: 'Art. 364',
    title: 'Basic provisions on concluding a contract',
    excerpt:
      'A contract is considered concluded when the parties, in the form required in the appropriate cases, have reached agreement on all its essential terms.',
  },
  {
    id: 'c4-quiz-1',
    type: 'quiz',
    question:
      'Aziz and a furniture workshop agree on the type of wardrobe, its dimensions and the price. Aziz writes that delivery by Friday is “absolutely necessary for me”. The workshop replies: “Agreed on everything except the delivery date.” Is the contract concluded?',
    options: [
      'Yes — the subject and the price are agreed, which is enough.',
      'No — the delivery date became an essential term because Aziz insisted on it.',
      'Yes — delivery dates are default terms supplied by law.',
      'No — a contract for furniture must always be notarised.',
    ],
    correct: 1,
    explanation:
      'A term on which one party expressly insists becomes essential for that contract. Since there is no agreement on the delivery date Aziz declared necessary, the contract is not yet concluded.',
  },
  { id: 'c4-h-3', type: 'h2', text: '4.3 Offer and acceptance' },
  {
    id: 'c4-p-5',
    type: 'p',
    text: 'The Code describes the formation of a contract as a dialogue of two steps. One party makes an **offer** — a proposal to conclude a contract. The other party gives an **acceptance** — its consent to that proposal. The contract is born at the moment the offeror receives the acceptance.',
  },
  {
    id: 'c4-p-6',
    type: 'p',
    text: 'Not every proposal is an offer. To qualify, it must be addressed to one or several specific persons, it must be *sufficiently definite* — that is, contain at least the essential terms — and it must express the offeror’s intention to be bound if the addressee accepts. An advertisement in a newspaper or a price list on a website is usually only an *invitation to make offers*: the seller has not yet committed to contract with everyone who responds.',
  },
  {
    id: 'c4-lex-365',
    type: 'lex',
    refId: 'cc-365',
    act: 'Civil Code',
    article: 'Art. 365',
    title: 'Offer',
    excerpt:
      'An offer is a proposal addressed to one or several specific persons which is sufficiently definite and expresses the intention of the offeror to consider itself bound by a contract with the addressee who accepts it.',
  },
  {
    id: 'c4-p-7',
    type: 'p',
    text: 'The exception is a **public offer**: a proposal containing all essential terms from which the will of the offeror to conclude a contract with *anyone* who responds can be seen. A vending machine, or an online store whose terms state that an order placed and paid for completes the sale, are typical examples.',
  },
  {
    id: 'c4-p-8',
    type: 'p',
    text: 'Acceptance must be **full and unconditional**. A reply that agrees “in principle” but changes the price, the quantity or the delivery date is not an acceptance. The law treats it as a refusal of the original offer and, at the same time, as a *new offer* — a counter-offer — which the original offeror is now free to accept or reject.',
  },
  {
    id: 'c4-fig-1',
    type: 'figure',
    figure: 'formation',
    caption: 'Figure 4.2. The path from offer to concluded contract. A reply on different terms returns the dialogue to the beginning with roles reversed.',
  },
  {
    id: 'c4-p-9',
    type: 'p',
    text: 'Silence, as a general rule, does not mean consent. A party cannot impose a contract on another by writing “if we do not hear from you within ten days, we will consider the order accepted.” Silence counts as acceptance only where this follows from law, from business custom, or from the previous dealings of the parties.',
  },
  {
    id: 'c4-lex-370',
    type: 'lex',
    refId: 'cc-370',
    act: 'Civil Code',
    article: 'Art. 370',
    title: 'Acceptance',
    excerpt:
      'Acceptance must be full and unconditional. Silence is not acceptance, unless otherwise follows from law, custom or previous business relations of the parties.',
  },
  {
    id: 'c4-note-1',
    type: 'note',
    text: 'Acceptance can also be expressed by conduct. If the addressee, within the period set for acceptance, begins performing the contract — ships the goods, pays the price, provides the service — this is treated as acceptance, unless the offer said otherwise.',
  },
  {
    id: 'c4-quiz-2',
    type: 'quiz',
    question:
      'A Tashkent textile company offers 2,000 metres of fabric at 38,000 soums per metre. The buyer replies: “We accept, but at 35,000 soums per metre.” What is the legal nature of the buyer’s reply?',
    options: [
      'An acceptance — the contract is concluded at 35,000 soums.',
      'An acceptance — the contract is concluded at the original price of 38,000 soums.',
      'A refusal of the offer and, at the same time, a new offer (counter-offer).',
      'An invitation to make offers, which has no legal effect.',
    ],
    correct: 2,
    explanation:
      'Acceptance must be full and unconditional. A reply that changes the price is treated as a refusal and a new offer. The company now becomes the addressee and may accept or reject 35,000 soums.',
  },
  { id: 'c4-h-4', type: 'h2', text: '4.4 Form and the moment of conclusion' },
  {
    id: 'c4-p-10',
    type: 'p',
    text: 'Many everyday contracts can be concluded orally — buying bread at a market is a complete contract of sale. For others, the law requires a **written form**, and sometimes a notarial form or state registration as well. When written form is required, it can be satisfied by a single document signed by both parties or by an exchange of letters, telegrams and electronic messages that reliably show who sent them.',
  },
  {
    id: 'c4-p-11',
    type: 'p',
    text: 'The consequences of ignoring the required form differ. Failure to use simple written form usually does not make the contract void, but it deprives the parties of the right to rely on witness testimony in a dispute. Failure to observe a notarial form or state registration, where the law requires it, generally makes the contract invalid.',
  },
  {
    id: 'c4-case-1',
    type: 'case',
    title: 'Case study: The silent supplier',
    facts:
      'On 3 March, “Samarkand Agro” LLC sent a written offer to a packaging manufacturer to buy 10,000 cardboard boxes, stating: “Please reply by 10 March.” The manufacturer did not reply, but on 8 March delivered 10,000 boxes to the buyer’s warehouse together with an invoice. On 9 March the buyer, having found a cheaper supplier, refused to accept the boxes, arguing that it never received an acceptance.',
    question: 'Was a contract concluded between the parties, and if so, at what moment?',
    analysis:
      'Yes. Performance of the contract within the period set for acceptance — here, the delivery of the boxes on 8 March, before the 10 March deadline — counts as acceptance by conduct. The contract was concluded when the offeror received that performance. The buyer’s refusal on 9 March came after the contract already existed, so it amounts to a breach rather than a withdrawal of the offer.',
  },
  { id: 'c4-h-5', type: 'h2', text: 'Summary' },
  {
    id: 'c4-list-2',
    type: 'list',
    items: [
      'A contract exists only when the parties agree on **all essential terms** in the required form.',
      'An **offer** must be addressed, definite and show an intention to be bound; advertisements are usually invitations to make offers.',
      'An **acceptance** must be full and unconditional; a reply on different terms is a **counter-offer**.',
      'Silence is not consent, except where law, custom or prior dealings say otherwise; performance can be acceptance.',
      'The contract is concluded at the moment the offeror **receives** the acceptance.',
    ],
  },
]

/* Civil Law Fundamentals — Chapter 3: short sample */
export const CLF_CH3: Block[] = [
  {
    id: 'c3-p1',
    type: 'p',
    text: 'An obligation is a legal relationship in which one person — the debtor — must perform a specific action for the benefit of another — the creditor: transfer property, perform work, pay money, or refrain from a certain action. The creditor, in turn, has the right to demand that performance.',
  },
  { id: 'c3-h1', type: 'h2', text: '3.1 Grounds for obligations' },
  {
    id: 'c3-p2',
    type: 'p',
    text: 'Obligations arise from contracts and other transactions, from causing harm, from unjust enrichment, and from other grounds indicated in the Code. Contract is by far the most common source, which is why the next chapter is devoted to how contracts are formed.',
  },
  { id: 'c3-h2', type: 'h2', text: '3.2 Proper performance' },
  {
    id: 'c3-p3',
    type: 'p',
    text: 'Obligations must be performed properly, in accordance with their terms and the requirements of law; in the absence of such terms — in accordance with business custom or other usually presented requirements. Unilateral refusal to perform an obligation is, as a rule, not permitted.',
  },
  {
    id: 'c3-quiz',
    type: 'quiz',
    question: 'Which of the following is NOT a ground for the emergence of an obligation?',
    options: ['A contract of sale', 'Causing harm to property', 'Unjust enrichment', 'A personal moral promise with no legal intent'],
    correct: 3,
    explanation: 'A promise made without any intention to create legal consequences — for example, a promise to call a friend — does not give rise to a civil-law obligation.',
  },
]

export const CONST_CH1: Block[] = [
  {
    id: 'k1-p1',
    type: 'p',
    text: 'A constitution is more than the highest-ranking legal act of a state. It is a statement of the principles on which public power is organised and of the limits that power may not cross. Studying constitutional law begins with understanding the constitution as a legal text that courts, officials and citizens apply directly.',
  },
  { id: 'k1-h1', type: 'h2', text: '1.1 Supremacy of the Constitution' },
  {
    id: 'k1-p2',
    type: 'p',
    text: 'The principle of supremacy means that laws and other normative legal acts must conform to the Constitution. Where a lower act contradicts it, the conflict is resolved in favour of the Constitution, and the Constitutional Court reviews the conformity of legislation with it.',
  },
  { id: 'k1-h2', type: 'h2', text: '1.2 Structure of the course' },
  {
    id: 'k1-p3',
    type: 'p',
    text: 'The following chapters move from the foundations of the constitutional order to human rights and freedoms, the system of state bodies, and local self-government. Each chapter ends with exercises that ask you to apply constitutional principles to short practical situations.',
  },
]

export const CRIM_CH1: Block[] = [
  {
    id: 'p1-p1',
    type: 'p',
    text: 'Criminal procedure governs how the state investigates, prosecutes and adjudicates crimes. Its rules exist for two reasons that sometimes pull in different directions: to find out what happened and to protect the person accused from arbitrary power.',
  },
  { id: 'p1-h1', type: 'h2', text: '1.1 Presumption of innocence' },
  {
    id: 'p1-p2',
    type: 'p',
    text: 'A person is presumed innocent until their guilt is proven in the manner prescribed by law and established by a court verdict that has entered into legal force. Doubts that cannot be removed are interpreted in favour of the accused, and the accused is not obliged to prove their innocence.',
  },
  {
    id: 'p1-quote',
    type: 'quote',
    text: 'The burden of proof lies with the prosecution — not as a courtesy to the defendant, but as a condition of a fair trial.',
    source: 'Demo commentary',
  },
]

export const BIZ_CH1: Block[] = [
  {
    id: 'b1-p1',
    type: 'p',
    text: 'Business law is the body of rules that governs the creation, operation and termination of commercial activity. For a lawyer advising entrepreneurs in Uzbekistan, the first questions are always practical: which legal form suits the business, who bears liability for its debts, and which contracts will carry its daily operations.',
  },
  { id: 'b1-h1', type: 'h2', text: '1.1 Choosing a legal form' },
  {
    id: 'b1-p2',
    type: 'p',
    text: 'The limited liability company remains the most common form for small and medium-sized businesses because its participants risk only the value of their contributions. A joint-stock company is preferred where capital is raised from many investors. An individual entrepreneur, by contrast, answers for business debts with personal property.',
  },
]

export const HR_CH1: Block[] = [
  {
    id: 'h1-p1',
    type: 'p',
    text: 'International human rights law is the part of public international law that obliges states to respect, protect and fulfil the rights of every person within their jurisdiction. It developed rapidly after 1945, beginning with the Universal Declaration of Human Rights in 1948.',
  },
  { id: 'h1-h1', type: 'h2', text: '1.1 Three types of state obligations' },
  {
    id: 'h1-list',
    type: 'list',
    items: [
      '**Respect** — the state must not itself interfere with the enjoyment of rights.',
      '**Protect** — the state must prevent third parties from violating rights.',
      '**Fulfil** — the state must take positive measures so that rights can be realised.',
    ],
  },
]

export const LRW_CH1: Block[] = [
  {
    id: 'r1-p1',
    type: 'p',
    text: 'Good legal writing is clear thinking made visible. Before you write a memorandum, you must know the question you are answering, the rule that governs it, and the facts that matter. The IRAC structure — Issue, Rule, Application, Conclusion — is a reliable starting point.',
  },
  { id: 'r1-h1', type: 'h2', text: '1.1 Finding the rule' },
  {
    id: 'r1-p2',
    type: 'p',
    text: 'In Uzbekistan the National Database of Legislation, Lex.uz, is the primary source for the current text of normative legal acts. Always cite the act, the article and the date of the version you relied on, and check whether the provision has been amended since.',
  },
]
