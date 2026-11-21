import type { LexReference } from './types'

/**
 * Lex.uz references used in the demo.
 * Article numbers and wording are paraphrased study summaries, not official text.
 * The amendment notice below is fully fictional and exists only to demonstrate the workflow.
 */
export const LEX_REFS: Record<string, LexReference> = {
  'cc-353': {
    id: 'cc-353',
    act: 'Civil Code of the Republic of Uzbekistan',
    article: 'Art. 353',
    title: 'Concept of a contract',
    currentText:
      'A contract is an agreement of two or more persons on the establishment, modification or termination of civil rights and obligations.',
    hasNotice: false,
  },
  'cc-354': {
    id: 'cc-354',
    act: 'Civil Code of the Republic of Uzbekistan',
    article: 'Art. 354',
    title: 'Freedom of contract',
    currentText:
      'Citizens and legal entities are free to conclude contracts. Compulsion to conclude a contract is not permitted, except where the obligation is provided for by the Code, by law or by a voluntarily assumed obligation.',
    hasNotice: false,
  },
  'cc-364': {
    id: 'cc-364',
    act: 'Civil Code of the Republic of Uzbekistan',
    article: 'Art. 364',
    title: 'Basic provisions on concluding a contract',
    currentText:
      'A contract is considered concluded when the parties, in the form required in the appropriate cases, have reached agreement on all its essential terms.',
    hasNotice: false,
  },
  'cc-365': {
    id: 'cc-365',
    act: 'Civil Code of the Republic of Uzbekistan',
    article: 'Art. 365',
    title: 'Offer',
    currentText:
      'An offer is a proposal addressed to one or several specific persons which is sufficiently definite and expresses the intention of the offeror to consider itself bound by a contract with the addressee who accepts it.',
    hasNotice: true,
    notice: {
      received: '14 Nov 2026',
      summary:
        'Sample notice: a linked provision may have been revised to address offers made through electronic platforms. The author should compare the wording and decide whether the chapter needs to change.',
      proposedText:
        'An offer is a proposal addressed to one or several specific persons, including a proposal sent through an electronic information system, which is sufficiently definite and expresses the intention of the offeror to consider itself bound by a contract with the addressee who accepts it.',
      affectedBook: 'civil-law-fundamentals',
      affectedChapter: 'clf-4',
    },
  },
  'cc-370': {
    id: 'cc-370',
    act: 'Civil Code of the Republic of Uzbekistan',
    article: 'Art. 370',
    title: 'Acceptance',
    currentText:
      'Acceptance is the response of the person to whom the offer is addressed about its acceptance. Acceptance must be full and unconditional. Silence is not acceptance, unless otherwise follows from law, custom or previous business relations of the parties.',
    hasNotice: false,
  },
}

export const LEX_DISCLAIMER =
  'Study summary prepared for this demo. Article numbers and wording are not an official text — always verify the current version on Lex.uz.'
