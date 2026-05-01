import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = 120;
const ITEM_SPACING = 12;

const ProductSlider = ({ products, selectedProduct, onSelectProduct, apiUrl }) => {
  const flatListRef = useRef(null);
  const scaleAnims = useRef(products.map(() => new Animated.Value(1))).current;

  // Seçili ürün değiştiğinde animasyon
  useEffect(() => {
    products.forEach((product, index) => {
      const isSelected = selectedProduct?.id === product.id;
      Animated.spring(scaleAnims[index], {
        toValue: isSelected ? 1.1 : 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
    });
  }, [selectedProduct]);

  // Seçili ürüne scroll
  useEffect(() => {
    if (selectedProduct && flatListRef.current) {
      const index = products.findIndex((p) => p.id === selectedProduct.id);
      if (index !== -1) {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      }
    }
  }, [selectedProduct]);

  const renderProduct = ({ item, index }) => {
    const isSelected = selectedProduct?.id === item.id;

    return (
      <Animated.View
        style={[
          styles.productContainer,
          {
            transform: [{ scale: scaleAnims[index] }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.productItem,
            isSelected && styles.selectedProductItem,
          ]}
          onPress={() => onSelectProduct(item)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={
              isSelected
                ? ["#FFD700", "#FFA500", "#FF8C00"]
                : ["#FFFFFF", "#F5F5F5"]
            }
            style={styles.productGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Seçili İndikatör */}
            {isSelected && (
              <View style={styles.selectedBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              </View>
            )}

            {/* Ürün Resmi */}
            <View style={styles.productImageContainer}>
              <Image
                source={{ uri: `${apiUrl}${item.imageUrl}` }}
                style={styles.productImage}
                resizeMode="cover"
              />
            </View>

            {/* Ürün Bilgisi */}
            <View style={styles.productInfo}>
              <Text
                style={[
                  styles.productName,
                  isSelected && styles.selectedProductName,
                ]}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <Text
                style={[
                  styles.productPrice,
                  isSelected && styles.selectedProductPrice,
                ]}
              >
                {item.price} TL
              </Text>
            </View>

            {/* Glow Effect */}
            {isSelected && <View style={styles.glowEffect} />}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="sparkles" size={20} color={COLORS.text} />
          <Text style={styles.headerTitle}>Bronzlaştırıcı Seç</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {selectedProduct
            ? `${selectedProduct.name} seçildi`
            : "Ürünleri kaydırarak dene"}
        </Text>
      </View>

      {/* Products Slider */}
      <FlatList
        ref={flatListRef}
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: ITEM_SPACING }} />}
        snapToInterval={ITEM_WIDTH + ITEM_SPACING}
        decelerationRate="fast"
        onScrollToIndexFailed={() => {}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.text,
    opacity: 0.6,
    marginLeft: 28,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  productContainer: {
    width: ITEM_WIDTH,
  },
  productItem: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  selectedProductItem: {
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  productGradient: {
    padding: 8,
    alignItems: "center",
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
  },
  productImageContainer: {
    width: ITEM_WIDTH - 16,
    height: ITEM_WIDTH - 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFF",
    marginBottom: 8,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productInfo: {
    alignItems: "center",
    paddingHorizontal: 4,
  },
  productName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 4,
    lineHeight: 16,
  },
  selectedProductName: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  selectedProductPrice: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  glowEffect: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
});

export default ProductSlider;
