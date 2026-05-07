import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/theme";

const TermsOfServiceScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kullanım Şartları</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Son Güncelleme: 7 Mayıs 2026</Text>

        <Text style={styles.sectionTitle}>1. Kabul ve Onay</Text>
        <Text style={styles.paragraph}>
          Born To Bronze mobil uygulamasını ("Uygulama") kullanarak, bu
          kullanım şartlarını okuduğunuzu, anladığınızı ve kabul ettiğinizi
          beyan edersiniz. Bu şartları kabul etmiyorsanız, lütfen uygulamayı
          kullanmayın.
        </Text>

        <Text style={styles.sectionTitle}>2. Uygulama Hakkında</Text>
        <Text style={styles.paragraph}>
          Born To Bronze uygulaması, Eda Taşpınar markasının bronzlaştırıcı
          ürünlerini satın almadan önce sanal olarak denemenizi sağlayan bir
          platformdur. Uygulama iki ana özellik sunar:
        </Text>
        <Text style={styles.bulletPoint}>
          • Gerçek zamanlı kamera ile bronzlaştırma önizlemesi
        </Text>
        <Text style={styles.bulletPoint}>
          • Fotoğraf üzerinde bronzlaştırma düzenleme
        </Text>

        <Text style={styles.sectionTitle}>3. Kullanım Koşulları</Text>
        <Text style={styles.paragraph}>
          Uygulamayı kullanırken aşağıdaki kurallara uymanız gerekmektedir:
        </Text>
        <Text style={styles.bulletPoint}>
          • Uygulamayı yalnızca yasal amaçlarla kullanacaksınız
        </Text>
        <Text style={styles.bulletPoint}>
          • Başkalarının haklarını ihlal etmeyeceksiniz
        </Text>
        <Text style={styles.bulletPoint}>
          • Uygulamayı tersine mühendislik, kopyalama veya değiştirme girişiminde bulunmayacaksınız
        </Text>
        <Text style={styles.bulletPoint}>
          • Uygulamayı zararlı yazılım yaymak için kullanmayacaksınız
        </Text>
        <Text style={styles.bulletPoint}>
          • Paylaştığınız içeriklerin telif haklarına sahip olduğunuzdan emin olacaksınız
        </Text>

        <Text style={styles.sectionTitle}>4. Fikri Mülkiyet Hakları</Text>
        <Text style={styles.paragraph}>
          Born To Bronze uygulamasının tasarımı, kodu ve arayüzü uygulama
          sağlayıcısına aittir. Uygulamada tanıtılan bronzlaştırıcı ürünler ve
          Eda Taşpınar markasına ait görsel/metin içerikler Eda Taşpınar
          mülkiyetindedir ve telif hakkı yasaları ile korunmaktadır. İzinsiz
          kullanım, kopyalama veya dağıtım yasaktır.
        </Text>

        <Text style={styles.sectionTitle}>5. Kullanıcı İçeriği</Text>
        <Text style={styles.paragraph}>
          Uygulamada oluşturduğunuz ve paylaştığınız içerikler (fotoğraflar,
          düzenlemeler) size aittir. Ancak, içeriği paylaşarak Eda Taşpınar'a
          aşağıdaki hakları vermiş olursunuz:
        </Text>
        <Text style={styles.bulletPoint}>
          • Paylaşılan içeriği pazarlama ve tanıtım amaçlı kullanma
        </Text>
        <Text style={styles.bulletPoint}>
          • İçeriği sosyal medya ve diğer platformlarda yayınlama
        </Text>
        <Text style={styles.bulletPoint}>• İçeriği düzenleme ve uyarlama</Text>
        <Text style={styles.paragraph}>
          Not: Paylaşmadığınız içerikler yalnızca cihazınızda kalır ve bizimle
          paylaşılmaz.
        </Text>

        <Text style={styles.sectionTitle}>6. Sorumluluk Reddi</Text>
        <Text style={styles.paragraph}>
          Uygulama "olduğu gibi" sunulmaktadır. Eda Taşpınar aşağıdaki
          konularda sorumluluk kabul etmez:
        </Text>
        <Text style={styles.bulletPoint}>
          • Bronzlaştırma önizlemesinin gerçek ürün sonucuyla tam eşleşmemesi
        </Text>
        <Text style={styles.bulletPoint}>
          • Uygulama kullanımından kaynaklanan cihaz sorunları
        </Text>
        <Text style={styles.bulletPoint}>
          • İnternet bağlantısı veya teknik sorunlardan kaynaklanan kesintiler
        </Text>
        <Text style={styles.bulletPoint}>
          • Üçüncü taraf hizmetlerden kaynaklanan sorunlar
        </Text>

        <Text style={styles.sectionTitle}>7. Garanti Reddi</Text>
        <Text style={styles.paragraph}>
          Uygulama, bronzlaştırıcı ürünlerin yaklaşık görünümünü gösterir.
          Gerçek sonuçlar, cilt tonu, uygulama tekniği ve ürün miktarına göre
          değişiklik gösterebilir. Uygulama sonuçları, gerçek ürün kullanımı
          için garanti teşkil etmez.
        </Text>

        <Text style={styles.sectionTitle}>8. İndirim Kodları</Text>
        <Text style={styles.paragraph}>
          Uygulama üzerinden kazanılan indirim kodları:
        </Text>
        <Text style={styles.bulletPoint}>
          • Yalnızca www.edataspinar.com'da geçerlidir
        </Text>
        <Text style={styles.bulletPoint}>
          • Belirli bir süre için geçerlidir
        </Text>
        <Text style={styles.bulletPoint}>
          • Diğer kampanyalarla birleştirilemez
        </Text>
        <Text style={styles.bulletPoint}>• Nakit karşılığı yoktur</Text>
        <Text style={styles.bulletPoint}>
          • Eda Taşpınar tarafından iptal edilebilir
        </Text>

        <Text style={styles.sectionTitle}>9. Hesap Sonlandırma</Text>
        <Text style={styles.paragraph}>
          Eda Taşpınar, bu kullanım şartlarını ihlal eden kullanıcıların
          hesaplarını önceden bildirimde bulunmaksızın askıya alabilir veya
          sonlandırabilir.
        </Text>

        <Text style={styles.sectionTitle}>10. Değişiklikler</Text>
        <Text style={styles.paragraph}>
          Eda Taşpınar, bu kullanım şartlarını istediği zaman değiştirme
          hakkını saklı tutar. Değişiklikler bu sayfada yayınlanacak ve "Son
          Güncelleme" tarihi güncellenecektir. Önemli değişiklikler için
          uygulama içi bildirim göndereceğiz.
        </Text>

        <Text style={styles.sectionTitle}>11. Uygulanacak Hukuk</Text>
        <Text style={styles.paragraph}>
          Bu kullanım şartları Türkiye Cumhuriyeti yasalarına tabidir.
          Uygulamadan kaynaklanan tüm uyuşmazlıklar İstanbul mahkemelerinde
          çözülecektir.
        </Text>

        <Text style={styles.sectionTitle}>12. İletişim</Text>
        <Text style={styles.paragraph}>
          Kullanım şartları hakkında sorularınız varsa, bizimle iletişime
          geçebilirsiniz:
        </Text>
        <Text style={styles.bulletPoint}>
          • E-posta: info@edataspinar.com
        </Text>
        <Text style={styles.bulletPoint}>• Web: www.edataspinar.com</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 Eda Taşpınar. Tüm hakları saklıdır.
          </Text>
          <Text style={styles.footerText}>
            Born To Bronze — Eda Taşpınar'ın resmi uygulaması
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
    paddingBottom: 16,
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
    paddingHorizontal: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.6,
    marginTop: 20,
    marginBottom: 10,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 25,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 10,
  },
  bulletPoint: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 8,
    paddingLeft: 10,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 30,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.5,
  },
});

export default TermsOfServiceScreen;
