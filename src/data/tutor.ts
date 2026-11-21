/**
 * Simulated AI Tutor. All answers are pre-written for the demo chapters and matched by keywords.
 * No language model is called.
 */
export type TutorMode = 'explain' | 'summarize' | 'ask'

interface Topic {
  id: string
  label: string
  keywords: string[]
  explain: string
  example?: string
}

const TOPICS: Topic[] = [
  {
    id: 'counter',
    label: 'Counter-offer',
    keywords: ['counter', 'different terms', 'new offer', 'changes the price', 'in principle', 'refusal of the original'],
    explain:
      'A counter-offer happens when the addressee replies “yes, but…”. Because acceptance must mirror the offer exactly, any change — to price, quantity or dates — means the original offer is rejected. The reply itself becomes a fresh offer, and the roles swap: the original offeror now decides whether to accept.',
    example:
      'You offer to sell your laptop for 6 million soums. Your friend says “I’ll take it for 5 million.” There is no contract yet — your friend has made you a new offer of 5 million.',
  },
  {
    id: 'silence',
    label: 'Silence and acceptance',
    keywords: ['silence', 'silent', 'do not hear', 'consent'],
    explain:
      'Silence normally means nothing in contract law. Nobody can be bound simply because they did not answer. There are three exceptions: when a law says silence counts, when it is an established business custom, or when the parties’ previous dealings show that silence was always treated as agreement.',
    example:
      'If a supplier has delivered milk to a café every Monday for two years without written orders, the café’s silence after a routine weekly offer may be treated as acceptance because of the parties’ previous relations.',
  },
  {
    id: 'public',
    label: 'Public offer',
    keywords: ['public offer', 'anyone', 'vending', 'online store'],
    explain:
      'A public offer is addressed to everyone rather than to specific persons. It must contain all essential terms and clearly show that the offeror will contract with whoever responds. Unlike an ordinary advertisement, a public offer binds the offeror as soon as someone accepts.',
    example: 'A website that says “Order and pay now — the course is yours” is making a public offer; payment is the acceptance.',
  },
  {
    id: 'invitation',
    label: 'Invitation to make offers',
    keywords: ['advertisement', 'invitation', 'price list', 'newspaper'],
    explain:
      'An advertisement or a catalogue is usually only an invitation for others to make offers. The seller is signalling willingness to negotiate, not promising to sell to everyone. The customer who responds makes the offer, and the seller remains free to accept or decline it.',
  },
  {
    id: 'acceptance',
    label: 'Acceptance',
    keywords: ['acceptance', 'accept', 'unconditional', 'conduct', 'performing'],
    explain:
      'Acceptance is the addressee’s answer “yes” to an offer. It must be full and unconditional — agreeing to everything, changing nothing. It can be expressed in words or by conduct, for example by paying the price or shipping the goods within the time set for acceptance.',
    example: 'If a shop emails you an offer and you pay the invoice within the stated deadline, your payment is acceptance by conduct.',
  },
  {
    id: 'offer',
    label: 'Offer',
    keywords: ['offer', 'offeror', 'proposal', 'definite', 'intention'],
    explain:
      'An offer is a proposal that is ready to become a contract the moment the other side says yes. Three features distinguish it: it is addressed to specific persons, it is definite enough to contain at least the essential terms, and it shows that the offeror intends to be bound.',
    example: '“I will sell you 500 kg of rice at 14,000 soums per kg, delivered to your shop on Monday” is an offer. “We have rice at good prices” is not.',
  },
  {
    id: 'essential',
    label: 'Essential terms',
    keywords: ['essential', 'subject', 'insists', 'default', 'ordinary'],
    explain:
      'Essential terms are the minimum that must be agreed before a contract exists. They come from three sources: the subject of the contract (always essential), terms the law calls essential for a particular contract type, and any term that one of the parties says it cannot do without. Everything else can be filled in by the law’s default rules.',
    example: 'In a sale of an apartment, the apartment itself and the price are essential. The day of handing over keys can be left to default rules — unless one party insists on a date.',
  },
  {
    id: 'freedom',
    label: 'Freedom of contract',
    keywords: ['freedom', 'free to', 'compulsion', 'public contract', 'mandatory'],
    explain:
      'Freedom of contract means you decide whether to contract, with whom, and on what terms. The law limits this freedom in two ways: mandatory rules that parties cannot override, and situations where someone must contract — such as public contracts for electricity or retail trade.',
  },
  {
    id: 'form',
    label: 'Form of contract',
    keywords: ['form', 'written', 'notarial', 'registration', 'oral', 'witness'],
    explain:
      'Form is the way the agreement is recorded. Many contracts can be oral, but some must be written, notarised or registered. Breaking simple written form mostly affects proof — you lose the right to rely on witnesses. Ignoring notarial form or registration, where required, usually makes the contract invalid.',
  },
  {
    id: 'moment',
    label: 'Moment of conclusion',
    keywords: ['moment', 'receives', 'born', 'concluded'],
    explain:
      'The contract comes into existence when the offeror receives the acceptance — not when it is written or sent. This moment matters for deciding which law applies, when obligations begin, and whether an offer could still be withdrawn.',
  },
  {
    id: 'contract',
    label: 'Concept of a contract',
    keywords: ['contract', 'agreement', 'transaction', 'two or more'],
    explain:
      'A contract is an agreement between two or more persons that creates, changes or ends their civil rights and obligations. It is a kind of transaction, but one that always needs at least two matching declarations of will.',
  },
  {
    id: 'obligation',
    label: 'Obligation',
    keywords: ['obligation', 'debtor', 'creditor', 'performance', 'perform'],
    explain:
      'An obligation is a legal tie between a debtor, who must do something (or refrain from doing it), and a creditor, who can demand it. Obligations arise mainly from contracts, but also from harm, unjust enrichment and other grounds in the Code.',
  },
]

export const SUGGESTED_QUESTIONS = [
  'What is the difference between an offer and an advertisement?',
  'Why is a reply on different terms not an acceptance?',
  'When can silence mean consent?',
  'Which terms are essential in a contract?',
]

function findTopic(text: string): Topic | undefined {
  const t = text.toLowerCase()
  return TOPICS.find(topic => topic.keywords.some(k => t.includes(k)))
}

function shorten(text: string, words = 16) {
  const parts = text.replace(/\s+/g, ' ').trim().split(' ')
  return parts.length > words ? parts.slice(0, words).join(' ') + '…' : parts.join(' ')
}

export interface TutorAnswer {
  title: string
  paragraphs: string[]
  example?: string
  related?: string
  matched: boolean
}

export function tutorRespond(mode: TutorMode, input: string, chapterTitle: string): TutorAnswer {
  const topic = findTopic(input)
  if (mode === 'summarize') {
    const sentences = input
      .replace(/\*\*|\*/g, '')
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 0)
    const core = sentences.length > 2 ? [sentences[0], sentences[sentences.length - 1]] : sentences
    return {
      title: 'Summary of the selected passage',
      paragraphs: [
        topic
          ? `In short: this passage is about **${topic.label.toLowerCase()}**. ${topic.explain.split('. ')[0]}.`
          : `In short: ${core.join(' ')}`,
        `Key idea to remember for “${chapterTitle}”: ${shorten(core[0] ?? input, 22)}`,
      ],
      related: topic?.label,
      matched: Boolean(topic),
    }
  }
  if (!topic) {
    return {
      title: mode === 'ask' ? 'I can only answer about this chapter' : 'Explanation',
      paragraphs: [
        mode === 'ask'
          ? 'In this demo the tutor uses prepared explanations for the topics of the current chapter: offer, acceptance, counter-offer, silence, essential terms, form and the moment of conclusion. Try asking about one of them.'
          : `This passage belongs to “${chapterTitle}”. Read it together with the nearest section heading and the linked Civil Code reference — the tutor has no prepared explanation for this exact fragment.`,
      ],
      matched: false,
    }
  }
  return {
    title: mode === 'ask' ? topic.label : `Explaining: ${topic.label}`,
    paragraphs: [topic.explain],
    example: topic.example,
    related: topic.label,
    matched: true,
  }
}
