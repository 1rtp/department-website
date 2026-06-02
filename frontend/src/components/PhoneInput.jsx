import React from 'react';
import ReactPhoneInput, { isPossiblePhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export const PhoneInput = ({ value, onChange, placeholder }) => {

  const handleChange = (newValue) => {
    if (!newValue) {
      onChange(newValue);
      return;
    }
    if (!isPossiblePhoneNumber(newValue) || (value && newValue.length <= value.length)) {
      onChange(newValue);
      return;
    }
    onChange(newValue);
  };

  return (
    <ReactPhoneInput
      international
      defaultCountry="UA"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      limitMaxLength={true}
      numberInputProps={{
        className: [
          'flex-1 border-none bg-transparent text-[13px] text-foreground',
          'focus:outline-none focus:ring-0 py-3 pr-4',
          'placeholder:text-muted-foreground',
        ].join(' '),
      }}
      className={[
        'flex items-center w-full rounded-xl border border-border bg-background',
        'px-3 gap-2 transition-all',
        'focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40',
        '[&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:items-center [&_.PhoneInputCountry]:gap-1',
        '[&_.PhoneInputCountry]:border-r [&_.PhoneInputCountry]:border-border',
        '[&_.PhoneInputCountry]:pr-2 [&_.PhoneInputCountry]:mr-1',
        '[&_.PhoneInputCountrySelectArrow]:text-muted-foreground',
        '[&_.PhoneInputCountrySelectArrow]:opacity-60',
      ].join(' ')}
    />
  );
};