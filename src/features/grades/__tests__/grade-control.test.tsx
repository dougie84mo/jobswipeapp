// GradeControl interaction contract: collapsed pill shows the value (or the
// "Grade" placeholder), tapping opens the editor, typed input commits
// clamped on submit, emptying clears, and steppers commit immediately
// (mid-scale entry for ungraded).

import { fireEvent, render } from '@testing-library/react-native';

// expo-font (pulled in by @expo/vector-icons) requires expo-asset, which
// isn't a dependency of this project — icons are visual chrome the test
// doesn't assert on, so stub the module.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// eslint-disable-next-line import/first
import { GradeControl } from '@/features/grades/GradeControl';

describe('GradeControl', () => {
  it('shows the placeholder when ungraded and the value when graded', () => {
    const { getByText, rerender } = render(
      <GradeControl value={null} onCommit={jest.fn()} />,
    );
    expect(getByText('Grade')).toBeTruthy();
    rerender(<GradeControl value={82} onCommit={jest.fn()} />);
    expect(getByText('82')).toBeTruthy();
  });

  it('commits typed input clamped to 1-100 on submit', () => {
    const onCommit = jest.fn();
    const { getByText, getByLabelText } = render(
      <GradeControl value={null} onCommit={onCommit} accessibilityLabel="Jane" />,
    );
    fireEvent.press(getByText('Grade'));
    const input = getByLabelText('Grade, 1 to 100 for Jane');
    fireEvent.changeText(input, '250');
    fireEvent(input, 'submitEditing');
    expect(onCommit).toHaveBeenCalledWith(100);
  });

  it('clears the grade when the input is emptied', () => {
    const onCommit = jest.fn();
    const { getByText, getByLabelText } = render(
      <GradeControl value={70} onCommit={onCommit} />,
    );
    fireEvent.press(getByText('70'));
    const input = getByLabelText('Grade, 1 to 100');
    fireEvent.changeText(input, '');
    fireEvent(input, 'blur');
    expect(onCommit).toHaveBeenCalledWith(null);
  });

  it('does not commit when the value is unchanged', () => {
    const onCommit = jest.fn();
    const { getByText, getByLabelText } = render(
      <GradeControl value={70} onCommit={onCommit} />,
    );
    fireEvent.press(getByText('70'));
    fireEvent(getByLabelText('Grade, 1 to 100'), 'blur');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('steppers commit immediately; first tap on ungraded lands at 50', () => {
    const onCommit = jest.fn();
    const { getByText, getByLabelText } = render(
      <GradeControl value={null} onCommit={onCommit} />,
    );
    fireEvent.press(getByText('Grade'));
    fireEvent.press(getByLabelText('Raise grade'));
    expect(onCommit).toHaveBeenCalledWith(50);
  });

  it('steppers move an existing grade by one', () => {
    const onCommit = jest.fn();
    const { getByText, getByLabelText } = render(
      <GradeControl value={70} onCommit={onCommit} />,
    );
    fireEvent.press(getByText('70'));
    fireEvent.press(getByLabelText('Lower grade'));
    expect(onCommit).toHaveBeenCalledWith(69);
  });
});
