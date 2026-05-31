import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  className = '',
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`w-full mb-4 ${className}`}>
      {label && (
        <Text className="text-muted text-xs font-semibold mb-2 uppercase tracking-widest pl-1">
          {label}
        </Text>
      )}
      
      <View
        className={`w-full ${props.multiline ? 'h-32 py-3' : 'h-[56px]'} rounded-2xl flex-row ${
          props.multiline ? 'items-start' : 'items-center'
        } px-4 bg-dark-input border ${
          error
            ? 'border-red-500'
            : isFocused
            ? 'border-neon'
            : 'border-dark-border'
        }`}
      >
        {leftIcon && <View className={props.multiline ? 'mt-1 mr-3' : 'mr-3'}>{leftIcon}</View>}
        
        <TextInput
          className="flex-1 text-light h-full text-base"
          placeholderTextColor="#6B7280"
          textAlignVertical={props.multiline ? 'top' : undefined}
          onFocus={(e) => {
            setIsFocused(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
          {...props}
        />
      </View>

      {error && (
        <Text className="text-red-500 text-xs mt-1.5 ml-1 font-medium">
          {error}
        </Text>
      )}
    </View>
  );
};
