import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TERMS_ACCEPTED_KEY = "@terms_accepted";

const TermsAcceptanceScreen = ({ navigation, onAccept }) => {
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  const handleAccept = async () => {
    if (privacyChecked && termsChecked) {
      try {
        await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, "true");
        if (onAccept) {
          onAccept();
        }
      } catch (error) {
        console.error("Error saving terms acceptance:", error);
      }
    }
  };

  const openPrivacyPolicy = () => {
    navigation.navigate("PrivacyPolicy");
  };

  const openTermsOfService = () => {
    navigation.navigate("TermsOfService");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={60} color={COLORS.text} />
          <Text style={styles.title}>Hoş Geldiniz! 👋</Text>
          <Text style={styles.subtitle}>
            Devam etmeden önce, lütfen gizlilik politikamızı ve kullanım
            şartlarımızı okuyup kabul edin.
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color={COLORS.text} />
          <Text style={styles.infoText}>
            Eda Taşpınar uygulaması, bronzlaştırıcı ürünleri sanal olarak test
            etmenizi sağlar. Kamera ve fotoğraf verileriniz yalnızca cihazınızda
            işlenir ve sunucularımıza gönderilmez.
          </Text>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setPrivacyChecked(!privacyChecked)}
          >
            <View
              style={[
                styles.checkboxBox,
                privacyChecked && styles.checkboxBoxChecked,
              ]}
            >
              {privacyChecked && (
                <Ionicons name="checkmark" size={18} color={COLORS.background} />
              )}
            </View>
            <View style={styles.checkboxTextContainer}>
              <Text style={styles.checkboxText}>
                <TouchableOpacity onPress={openPrivacyPolicy}>
                  <Text style={styles.link}>Gizlilik Politikasını</Text>
                </TouchableOpacity>{" "}
                okudum ve kabul ediyorum
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setTermsChecked(!termsChecked)}
          >
            <View
              style={[
                styles.checkboxBox,
                termsChecked && styles.checkboxBoxChecked,
              ]}
            >
              {termsChecked && (
                <Ionicons name="checkmark" size={18} color={COLORS.background} />
              )}
            </View>
            <View style={styles.checkboxTextContainer}>
              <Text style={styles.checkboxText}>
                <TouchableOpacity onPress={openTermsOfService}>
                  <Text style={styles.link}>Kullanım Şartlarını</Text>
                </TouchableOpacity>{" "}
                okudum ve kabul ediyorum
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Neler Yapabilirsiniz?</Text>
          <View style={styles.feature}>
            <Ionicons name="camera" size={24} color={COLORS.text} />
            <Text style={styles.featureText}>
              Gerçek zamanlı bronzlaştırma önizlemesi
            </Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="image" size={24} color={COLORS.text} />
            <Text style={styles.featureText}>
              Fotoğraf üzerinde düzenleme
            </Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="gift" size={24} color={COLORS.text} />
            <Text style={styles.featureText}>
              Paylaşım ile indirim kodu kazanma
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.acceptButton,
            (!privacyChecked || !termsChecked) && styles.acceptButtonDisabled,
          ]}
          onPress={handleAccept}
          disabled={!privacyChecked || !termsChecked}
        >
          <Text style={styles.acceptButtonText}>Kabul Et ve Devam Et</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          Kabul ederek Eda Taşpınar uygulamasını kullanmaya başlayabilirsiniz
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.8,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: COLORS.button,
    borderRadius: 15,
    padding: 15,
    marginBottom: 30,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginLeft: 12,
  },
  checkboxContainer: {
    marginBottom: 30,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.text,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  link: {
    color: COLORS.text,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  featuresContainer: {
    backgroundColor: COLORS.button,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 15,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.text + "20",
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.button,
    borderWidth: 2,
    borderColor: COLORS.text,
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 30,
    marginBottom: 10,
  },
  acceptButtonDisabled: {
    opacity: 0.4,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginRight: 8,
  },
  footerNote: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: "center",
    opacity: 0.6,
  },
});

export default TermsAcceptanceScreen;

// Helper function to check if terms are accepted
export const checkTermsAccepted = async () => {
  try {
    const value = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
    return value === "true";
  } catch (error) {
    console.error("Error checking terms acceptance:", error);
    return false;
  }
};
