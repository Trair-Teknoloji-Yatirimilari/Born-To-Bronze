import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GalleryScreen = ({ navigation }) => {
  // Örnek veri - gerçek uygulamada bu veriler API'den gelecek
  const [photos, setPhotos] = React.useState([
    { id: '1', uri: 'https://picsum.photos/200/300' },
    { id: '2', uri: 'https://picsum.photos/200/300' },
    { id: '3', uri: 'https://picsum.photos/200/300' },
  ]);

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.photoContainer}
      onPress={() => navigation.navigate('PhotoEdit', { photo: item })}
    >
      <Image source={{ uri: item.uri }} style={styles.photo} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Galeri</Text>
      </View>
      
      <FlatList
        data={photos}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.gallery}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  gallery: {
    padding: 10,
  },
  photoContainer: {
    flex: 1,
    margin: 5,
    aspectRatio: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
});

export default GalleryScreen; 