import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: '' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    this.setState({ errorInfo: errorInfo.componentStack || '' });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <AlertTriangle size={48} color="#EF4444" />
            <Text style={styles.title}>Beklenmeyen Bir Hata Oluştu</Text>
            <Text style={styles.message}>
              {this.state.error?.message || 'Bilinmeyen bir hata oluştu.'}
            </Text>

            {__DEV__ && this.state.errorInfo ? (
              <ScrollView style={styles.stackBox} showsVerticalScrollIndicator={false}>
                <Text style={styles.stackText}>{this.state.errorInfo}</Text>
              </ScrollView>
            ) : null}

            <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry} activeOpacity={0.85}>
              <RefreshCw size={16} color="#0E1117" />
              <Text style={styles.retryText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1117',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#131820',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EF444430',
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  stackBox: {
    backgroundColor: '#0E1117',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    maxHeight: 120,
    marginBottom: 16,
  },
  stackText: {
    color: '#EF4444',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  retryBtn: {
    backgroundColor: '#DEFF9A',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryText: {
    color: '#0E1117',
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 6,
  },
});
