import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // State'i güncelle ki sonraki render'da fallback UI gösterilsin
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Hata bilgilerini state'e kaydet
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Crash reporting - production'da Sentry'ye gönderilecek
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // Development'da console'a log
    if (__DEV__) {
      console.group('🚨 Error Boundary Caught an Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Production'da crash reporting service'e gönder
    try {
      // TODO: Sentry entegrasyonu yapıldığında:
      // Sentry.captureException(error, {
      //   contexts: {
      //     react: {
      //       componentStack: errorInfo.componentStack,
      //     },
      //   },
      // });

      // Geçici olarak API'ye hata raporu gönder
      this.reportErrorToAPI(error, errorInfo);
    } catch (reportingError) {
      console.error('Error reporting failed:', reportingError);
    }
  };

  reportErrorToAPI = async (error, errorInfo) => {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        appVersion: '1.0.0', // TODO: Get from constants
        retryCount: this.state.retryCount,
        userAgent: navigator.userAgent,
      };

      // Backend'e hata raporu gönder
      // fetch(`${API_URL}/api/errors/report`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport),
      // });
    } catch (reportError) {
      console.error('Failed to report error to API:', reportError);
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleRestart = () => {
    // App'i tamamen yeniden başlat
    Alert.alert(
      'Uygulamayı Yeniden Başlat',
      'Uygulama temiz bir şekilde yeniden başlatılacak.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Yeniden Başlat',
          style: 'destructive',
          onPress: () => {
            // React Native'de app restart için
            // TODO: react-native-restart kullanılabilir
            console.log('App restart requested');
          },
        },
      ]
    );
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <View style={styles.container}>
          <LinearGradient
            colors={['#FF6B35', '#F7931E', '#FFD23F']}
            style={StyleSheet.absoluteFill}
          />
          
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.errorContainer}>
              {/* Error Icon */}
              <View style={styles.iconContainer}>
                <Ionicons name="warning" size={60} color="#fff" />
              </View>

              {/* Error Title */}
              <Text style={styles.errorTitle}>
                Bir Şeyler Ters Gitti! 😔
              </Text>

              {/* Error Description */}
              <Text style={styles.errorDescription}>
                Beklenmeyen bir hata oluştu. Geliştiriciler otomatik olarak 
                bilgilendirildi ve sorunu çözmek için çalışıyorlar.
              </Text>

              {/* Error Details (Development Only) */}
              {__DEV__ && this.state.error && (
                <View style={styles.errorDetails}>
                  <Text style={styles.errorDetailsTitle}>
                    🔍 Geliştirici Detayları:
                  </Text>
                  <Text style={styles.errorDetailsText}>
                    {this.state.error.toString()}
                  </Text>
                  {this.state.errorInfo && (
                    <Text style={styles.errorDetailsText}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={this.handleRetry}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.restartButton}
                  onPress={this.handleRestart}
                >
                  <Ionicons name="reload" size={20} color="#FF6B35" />
                  <Text style={styles.restartButtonText}>Yeniden Başlat</Text>
                </TouchableOpacity>
              </View>

              {/* Retry Count Info */}
              {this.state.retryCount > 0 && (
                <Text style={styles.retryInfo}>
                  Deneme sayısı: {this.state.retryCount}
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }

    // Normal durum - children'ı render et
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorDescription: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    opacity: 0.8,
  },
  errorDetails: {
    backgroundColor: 'rgba(92, 58, 33, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  errorDetailsText: {
    fontSize: 12,
    color: COLORS.text,
    fontFamily: 'monospace',
    opacity: 0.7,
    lineHeight: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  restartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  restartButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  retryInfo: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.6,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default ErrorBoundary; 