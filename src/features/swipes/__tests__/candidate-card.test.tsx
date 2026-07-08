// CandidateCard render contract: sections appear only when the candidate has
// the data, skills cap at 8 with a "+N more" chip, and highlightSkills accents
// matching chips case-insensitively (checked via style, since the chip text
// renders the same either way).

import { render } from '@testing-library/react-native';

import type { Candidate } from '@/ats/types';

// expo-font (pulled in by @expo/vector-icons) requires expo-asset, which
// isn't a dependency of this project — icons are visual chrome the test
// doesn't assert on, so stub the module.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// eslint-disable-next-line import/first
import { CandidateCard } from '@/features/swipes/CandidateCard';

const richCandidate: Candidate = {
  externalId: 'c1',
  requisitionExternalId: 'r1',
  fullName: 'Maya Okafor',
  headline: 'Backend engineer • Go / Postgres',
  location: 'Brooklyn, NY',
  yearsExperience: 7.5,
  skills: ['Go', 'PostgreSQL', 'AWS', 'Kubernetes', 'GraphQL', 'React', 'dbt', 'Figma', 'Swift', 'Kotlin'],
  experience: [
    { title: 'Senior Engineer', company: 'Halcyon Data', start: '2022-01' },
    { title: 'Engineer', company: 'Oakline', start: '2019-03', end: '2021-12' },
    { title: 'Junior Engineer', company: 'Brightpath', start: '2017-01', end: '2019-02' },
    { title: 'Intern', company: 'Fernworks', start: '2016-05', end: '2016-12' },
  ],
  education: [
    { school: 'State University', degree: 'B.S.', field: 'Computer Science', end: '2016-05' },
  ],
  raw: {},
};

const sparseCandidate: Candidate = {
  externalId: 'c2',
  requisitionExternalId: 'r1',
  fullName: 'Sam Sparse',
  raw: {},
};

describe('CandidateCard', () => {
  it('renders identity, meta, skills, experience, and education when present', () => {
    const { getByText } = render(<CandidateCard candidate={richCandidate} />);
    expect(getByText('Maya Okafor')).toBeTruthy();
    expect(getByText('Backend engineer • Go / Postgres')).toBeTruthy();
    expect(getByText('Brooklyn, NY')).toBeTruthy();
    expect(getByText('~8 yrs experience')).toBeTruthy();
    expect(getByText('EXPERIENCE')).toBeTruthy();
    expect(getByText('Senior Engineer')).toBeTruthy();
    expect(getByText('Halcyon Data · Jan 2022 – Present')).toBeTruthy();
    expect(getByText('EDUCATION')).toBeTruthy();
    expect(getByText(/B\.S\., Computer Science — State University/)).toBeTruthy();
  });

  it('shows initials in the monogram when there is no photo', () => {
    const { getByText } = render(<CandidateCard candidate={richCandidate} />);
    expect(getByText('MO')).toBeTruthy();
  });

  it('caps skills at 8 and shows a +N more chip', () => {
    const { getByText, queryByText } = render(
      <CandidateCard candidate={richCandidate} />,
    );
    expect(getByText('Go')).toBeTruthy();
    expect(getByText('Figma')).toBeTruthy(); // 8th
    expect(queryByText('Swift')).toBeNull(); // 9th hidden
    expect(getByText('+2 more')).toBeTruthy();
  });

  it('caps experience at 3 rows and summarizes the rest', () => {
    const { getByText, queryByText } = render(
      <CandidateCard candidate={richCandidate} />,
    );
    expect(getByText('Junior Engineer')).toBeTruthy(); // 3rd
    expect(queryByText('Intern')).toBeNull(); // 4th hidden
    expect(getByText('+1 earlier role')).toBeTruthy();
  });

  it('omits every optional section for a sparse candidate', () => {
    const { getByText, queryByText } = render(
      <CandidateCard candidate={sparseCandidate} />,
    );
    expect(getByText('Sam Sparse')).toBeTruthy();
    expect(getByText('SS')).toBeTruthy(); // initials monogram
    expect(queryByText('EXPERIENCE')).toBeNull();
    expect(queryByText('EDUCATION')).toBeNull();
    expect(queryByText(/yrs experience/)).toBeNull();
  });

  it('accents chips matching highlightSkills case-insensitively', () => {
    const { getByText } = render(
      <CandidateCard candidate={richCandidate} highlightSkills={['go', 'AWS']} />,
    );
    const matched = getByText('Go');
    const unmatched = getByText('PostgreSQL');
    const flatten = (style: unknown) =>
      Object.assign({}, ...(Array.isArray(style) ? style.flat() : [style]));
    expect(flatten(matched.props.style).color).toBe('#208AEF');
    expect(flatten(unmatched.props.style).color).not.toBe('#208AEF');
  });
});
