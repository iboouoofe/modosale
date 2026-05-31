import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-neon text-dark font-bold border-neon';
      case 'secondary':
        return 'bg-dark-input text-light border-dark-border';
      case 'outline':
        return 'bg-transparent text-neon border-neon border';
      default:
        return 'bg-neon text-dark font-bold';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return 'text-dark font-extrabold';
      case 'secondary':
        return 'text-light font-semibold';
      case 'outline':
        return 'text-neon font-bold';
      default:
        return 'text-dark font-bold';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={disabled || isLoading}
      className={`w-full py-4 px-6 rounded-2xl flex-row justify-center items-center h-[56px] border ${getStyles()} ${
        disabled ? 'opacity-40' : 'opacity-100'
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#121212' : '#DEFF9A'} size="small" />
      ) : (
        <View pointerEvents="none" className="flex-row items-center justify-center">
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={`text-base tracking-wide ${getTextColor()}`}>{title}</Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};
