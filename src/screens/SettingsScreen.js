import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";

const SettingsScreen = ({ navigation }) => {
  const [appVersion] = useState(Application.nativeApplicationVersion || "1.0.0");

  const handleResetAppData = () => {
    Alert.alert(
      "Uygulama Verilerini Sıfırla",
      "Tüm uygulama verileri silinecek ve ilk açılış ekranına döneceksiniz. Bu işlem geri alınamaz.\n\n• Onboarding tercihleri\n• Önbellek\n• Yerel ayarlar",
      [
        {
          text: "İptal",
          style: "cancel",
        },
        {
          text: "Sıfırla",
          style: "destructive",
          onPress: async () => {
            try {
              // Tüm local verileri temizle
              await AsyncStorage.clear();
              
              Alert.alert(
                "Veriler Sıfırlandı",
                "Uygulama verileri başarıyla temizlendi. Uygulama yeniden başlatılacak.",
                [
                  {
                    text: "Tamam",
                    onPress: () => {
                      // Uygulamayı yeniden başlat
                      navigation.reset({
                        index: 0,
                        routes: [{ name: "TermsAcceptance" }],
                      });
                    },
                  },
                ]
              );
            } catch (error) {
              Alert.alert(
                "Hata",
                "Veriler silinirken bir hata oluştu. Lütfen tekrar deneyin."
              );
            }
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      "Destek",
      "Nasıl iletişime geçmek istersiniz?",
      [
        {
          text: "E-posta",
          onPress: () => {
            Linking.openURL("mailto:info@edataspinar.com?subject=Eda Uygulama Destek");
          },
        },
        {
          text: "Web Sitesi",
          onPress: () => {
            Linking.openURL("https://www.edataspinar.com");
          },
        },
        {
          text: "İptal",
          style: "cancel",
        },
      ]
    );
  };

  const handleRateApp = () => {
    // iOS App Store veya Android Play Store link'i
    const storeUrl = Platform.OS === "ios"
      ? "https://apps.apple.com/app/id" // Gerçek App Store ID'si eklenecek
      : "https://play.google.com/store/apps/details?id=com.borntobronze.android";
    
    Linking.openURL(storeUrl);
  };

  const handleShareApp = () => {
    Alert.alert(
      "Uygulamayı Paylaş",
      "Eda Taşpınar uygulamasını arkadaşlarınızla paylaşın!",
      [
        {
          text: "Tamam",
        },
      ]
    );
  };

  const SettingItem = ({ icon, title, subtitle, onPress, danger, showArrow = true }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Ionicons name={icon} size={24} color={danger ? "#FF3B30" : COLORS.text} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.text} opacity={0.3} />
      )}
    </TouchableOpacity>
  );

  const SettingSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SettingSection title="Yasal">
          <SettingItem
            icon="shield-checkmark"
            title="Gizlilik Politikası"
            subtitle="Verilerinizin nasıl korunduğunu öğrenin"
            onPress={() => navigation.navigate("PrivacyPolicy")}
          />
          <SettingItem
            icon="document-text"
            title="Kullanım Şartları"
            subtitle="Uygulama kullanım koşulları"
            onPress={() => navigation.navigate("TermsOfService")}
          />
        </SettingSection>

        <SettingSection title="Destek">
          <SettingItem
            icon="mail"
            title="İletişim"
            subtitle="Bize ulaşın: info@edataspinar.com"
            onPress={handleContactSupport}
          />
          <SettingItem
            icon="help-circle"
            title="Yardım & SSS"
            subtitle="Sık sorulan sorular"
            onPress={() => {
              Linking.openURL("https://www.edataspinar.com");
            }}
          />
          <SettingItem
            icon="star"
            title="Uygulamayı Değerlendir"
            subtitle="Görüşleriniz bizim için önemli"
            onPress={handleRateApp}
          />
          <SettingItem
            icon="share-social"
            title="Uygulamayı Paylaş"
            subtitle="Arkadaşlarınızla paylaşın"
            onPress={handleShareApp}
          />
        </SettingSection>

        <SettingSection title="Hakkında">
          <SettingItem
            icon="information-circle"
            title="Uygulama Versiyonu"
            subtitle={`v${appVersion}`}
            onPress={() => {}}
            showArrow={false}
          />
          <SettingItem
            icon="globe"
            title="Web Sitesi"
            subtitle="www.edataspinar.com"
            onPress={() => {
              Linking.openURL("https://www.edataspinar.com");
            }}
          />
          <SettingItem
            icon="business"
            title="Şirket"
            subtitle="Eda Taşpınar"
            onPress={() => {}}
            showArrow={false}
          />
        </SettingSection>

        <SettingSection title="Veri Yönetimi">
          <SettingItem
            icon="refresh"
            title="Uygulama Verilerini Sıfırla"
            subtitle="Tüm yerel verileri temizle ve baştan başla"
            onPress={handleResetAppData}
            danger
          />
        </SettingSection>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 Eda Taşpınar
          </Text>
          <Text style={styles.footerText}>
            Tüm hakları saklıdır
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.text + "20",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    opacity: 0.5,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: COLORS.button,
    borderRadius: 15,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.text + "10",
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingIconDanger: {
    backgroundColor: "#FF3B3020",
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  settingTitleDanger: {
    color: "#FF3B30",
  },
  settingSubtitle: {
    fontSize: 13,
    color: COLORS.text,
    opacity: 0.6,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.4,
    marginBottom: 4,
  },
});

export default SettingsScreen;
