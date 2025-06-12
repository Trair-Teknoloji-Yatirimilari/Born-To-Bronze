import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const WelcomeScreen = ({ navigation }) => {
  return (
    <ImageBackground
      source={require('../assets/welcome-bg.png')}
      style={styles.background}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
        style={styles.gradient}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Bronzify</Text>
          <Text style={styles.subtitle}>
            Bronzlaştırıcı kremlerinizi önizleyin
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('RealTime')}
            >
              <Text style={styles.buttonText}>Gerçek Zamanlı Önizleme</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate('PhotoEdit')}
            >
              <Text style={styles.buttonText}>Fotoğraf Düzenleme</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 2,
  },
  title: {
    ...FONTS.bold,
    fontSize: SIZES.extraLarge * 2,
    color: COLORS.background,
    marginBottom: SIZES.base,
  },
  subtitle: {
    ...FONTS.regular,
    fontSize: SIZES.large,
    color: COLORS.background,
    textAlign: 'center',
    marginBottom: SIZES.padding * 3,
  },
  buttonContainer: {
    width: '100%',
    gap: SIZES.padding,
  },
  button: {
    backgroundColor: COLORS.button,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    width: '100vw',
  },
  secondaryButton: {
    backgroundColor: COLORS.button,
  },
  buttonText: {
    ...FONTS.medium,
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
});

export default WelcomeScreen; 