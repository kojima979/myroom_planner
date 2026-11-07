import React, { useEffect, useState } from 'react';

type Props = {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  /** trueの場合、キー入力中は確定せずEnterまたはフォーカスアウト時にonChangeを呼ぶ（壁長やクリアランス移動用） */
  commitOnBlurOnly?: boolean;
};

/**
 * 入力途中の桁消しや500以下の小数値入力でも勝手に値が書き換わらない数値入力コンポーネント
 */
export const NumericInput: React.FC<Props> = ({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 10,
  className = '',
  commitOnBlurOnly = false,
}) => {
  const [draft, setDraft] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // フォーカスしていない時のみ外部のvalue変化を同期する
  useEffect(() => {
    if (!isFocused) {
      setDraft(String(value));
    }
  }, [value, isFocused]);

  const commitValue = (rawText: string) => {
    const trimmed = rawText.trim();
    if (trimmed === '' || trimmed === '-') {
      setDraft(String(value));
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, Math.round(parsed)));
    setDraft(String(clamped));
    if (clamped !== value) {
      onChange(clamped);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setDraft(text);

    if (!commitOnBlurOnly) {
      const trimmed = text.trim();
      if (trimmed !== '' && trimmed !== '-') {
        const parsed = Number(trimmed);
        if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) {
          onChange(Math.round(parsed));
        }
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    commitValue(draft);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setDraft(String(value));
      setIsFocused(false);
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="number"
      step={step}
      value={draft}
      onFocus={() => setIsFocused(true)}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
    />
  );
};
