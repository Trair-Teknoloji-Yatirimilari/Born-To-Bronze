import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { FaceDetector } from '@react-native-ml-kit/face-detection';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const RealTimeScreen = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [selectedBronze, setSelectedBronze] = useState(null);
  const devices = useCameraDevices();
  const device = devices.front;

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const cameraPermission = await Camera.requestCameraPermission();
    setHasPermission(cameraPermission === 'granted');
  };

  const bronzeOptions = [
    { id: 1, name: 'Açık Bronz', color: COLORS.bronze.light },
    { id: 2, name: 'Orta Bronz', color: COLORS.bronze.medium },
    { id: 3, name: 'Koyu Bronz', color: COLORS.bronze.dark },
  ];

  const onFacesDetected = useCallback((faces) => {
    if (faces.length > 0 && selectedBronze) {
      // Yüz tespiti yapıldı ve bronzlaştırıcı seçildi
      // Burada yüz üzerine bronzlaştırıcı efekti uygulanacak
      console.log('Yüz tespit edildi:', faces[0]);
    }
  }, [selectedBronze]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Kamera izni gerekli</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Kamera yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        onFacesDetected={onFacesDetected}
      />

      <View style={styles.controlsContainer}>
        <View style={styles.bronzeOptions}>
          {bronzeOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.bronzeButton,
                { backgroundColor: option.color },
                selectedBronze === option.id && styles.selectedBronze,
              ]}
              onPress={() => setSelectedBronze(option.id)}
            >
              <Text style={styles.bronzeButtonText}>{option.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  text: {
    ...FONTS.medium,
    fontSize: SIZES.large,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SIZES.padding * 2,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SIZES.padding,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bronzeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SIZES.padding,
  },
  bronzeButton: {
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    minWidth: 100,
    alignItems: 'center',
  },
  selectedBronze: {
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  bronzeButtonText: {
    ...FONTS.medium,
    color: COLORS.background,
    fontSize: SIZES.small,
  },
});

export default RealTimeScreen; 