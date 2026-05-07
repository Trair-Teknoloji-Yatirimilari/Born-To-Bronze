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

const PrivacyPolicyScreen = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>Gizlilik Politikası</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Son Güncelleme: 7 Mayıs 2026</Text>

        <Text style={styles.sectionTitle}>1. Giriş</Text>
        <Text style={styles.paragraph}>
          Born To Bronze mobil uygulaması ("Uygulama"), Eda Taşpınar markasının
          bronzlaştırıcı ürünlerini satın almadan önce cihazınızın kamerasıyla
          veya galeri fotoğraflarıyla sanal olarak denemenizi sağlayan bir
          uygulamadır. Bu gizlilik politikası, uygulamayı kullanırken kişisel
          verilerinizin nasıl toplandığını, kullanıldığını, korunduğunu ve
          saklandığını açıklar.
        </Text>

        <Text style={styles.sectionTitle}>2. Toplanan Bilgiler</Text>
        <Text style={styles.paragraph}>
          Uygulamamız aşağıdaki bilgileri toplayabilir:
        </Text>
        <Text style={styles.bulletPoint}>
          • Kamera Erişimi: Bronzlaştırma filtresi özelliğini kullanmak için
          kameranıza erişim sağlarız. Kamera görüntüleri cihazınızda işlenir ve
          sunucularımıza gönderilmez.
        </Text>
        <Text style={styles.bulletPoint}>
          • Fotoğraf Galerisi: Fotoğraf düzenleme özelliği için galerinizden
          fotoğraf seçmenize izin veririz. Seçilen fotoğraflar yalnızca
          cihazınızda işlenir.
        </Text>
        <Text style={styles.bulletPoint}>
          • Bildirim İzni: Size özel kampanyalar ve güncellemeler hakkında
          bildirim göndermek için bildirim izni isteriz.
        </Text>
        <Text style={styles.bulletPoint}>
          • Kullanım Verileri: Uygulama performansını iyileştirmek için anonim
          kullanım istatistikleri toplarız (hangi özelliklerin kullanıldığı,
          hata raporları vb.).
        </Text>

        <Text style={styles.sectionTitle}>3. Yüz Verilerinin İşlenmesi (Face Data)</Text>
        <Text style={styles.paragraph}>
          Born To Bronze, bronzlaştırma efektinin yalnızca cilt bölgelerine
          (alın, yanak, çene) doğru uygulanması için cihaz üzerinde gerçek
          zamanlı yüz kontur algılaması yapar. Aşağıdaki bilgiler Apple App
          Store yönergeleri (5.1.1) ve KVKK gereği açıkça belirtilmiştir:
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Hangi yüz verileri toplanıyor?</Text>{"\n"}
          Cihaz üzerinde çalışan Google ML Kit tarafından üretilen geçici
          geometrik kontur noktaları (yüz çevresi, yanaklar, göz ve dudak
          sınırları). Yüz tanıma ya da biyometrik kimlik oluşturan hiçbir veri
          toplanmaz, üretilmez veya depolanmaz.
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Ne amaçla kullanılıyor?</Text>{"\n"}
          Sanal bronzlaştırma renginin yalnızca cilt bölgelerine uygulanması ve
          göz, kaş, ağız gibi alanların dışlanması için klipleme maskesi
          oluşturmak amacıyla kullanılır.
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Üçüncü taraflarla paylaşılıyor mu?</Text>{"\n"}
          Hayır. Yüz verileri hiçbir üçüncü tarafla paylaşılmaz, sunucularımıza
          gönderilmez, yedeklenmez ve herhangi bir analiz/reklam sağlayıcıyla
          paylaşılmaz.
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Ne kadar süre saklanıyor?</Text>{"\n"}
          Yüz kontur verileri yalnızca tek bir kare süresince (tipik olarak 50
          milisaniyeden az) bellekte tutulur ve efekt çizildikten hemen sonra
          silinir. Kalıcı depolama yapılmaz.
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Nerede saklanıyor?</Text>{"\n"}
          Hiçbir yerde saklanmaz. Tüm işlem cihaz üzerindedir (on-device).
        </Text>

        <Text style={styles.sectionTitle}>4. Bilgilerin Kullanımı</Text>
        <Text style={styles.paragraph}>
          Topladığımız bilgileri şu amaçlarla kullanırız:
        </Text>
        <Text style={styles.bulletPoint}>
          • Bronzlaştırma filtresi ve fotoğraf düzenleme özelliklerini sağlamak
        </Text>
        <Text style={styles.bulletPoint}>
          • Uygulama performansını iyileştirmek ve hataları düzeltmek
        </Text>
        <Text style={styles.bulletPoint}>
          • Size özel kampanyalar ve ürün önerileri sunmak
        </Text>
        <Text style={styles.bulletPoint}>• Müşteri desteği sağlamak</Text>

        <Text style={styles.sectionTitle}>5. Veri Güvenliği</Text>
        <Text style={styles.paragraph}>
          Kişisel verilerinizin güvenliği bizim için önceliklidir. Tüm veriler
          TLS 1.2+ ile şifrelenmiş bağlantılar üzerinden iletilir ve güvenli
          sunucularda saklanır. Kamera ve yüz kontur verileri yalnızca
          cihazınızda işlenir ve sunucularımıza yüklenmez.
        </Text>

        <Text style={styles.sectionTitle}>6. Üçüncü Taraf Hizmetler</Text>
        <Text style={styles.paragraph}>
          Uygulamamız aşağıdaki üçüncü taraf hizmetlerini kullanmaktadır:
        </Text>
        <Text style={styles.bulletPoint}>
          • Sentry: Hata izleme ve performans analizi için (fotoğraf veya yüz
          verisi gönderilmez)
        </Text>
        <Text style={styles.bulletPoint}>
          • Expo / EAS: Uygulama geliştirme ve güncelleme altyapısı için
        </Text>
        <Text style={styles.bulletPoint}>
          • Google ML Kit (on-device): Cihaz üzerinde yüz kontur algılama için
          (ağ bağlantısı kullanmaz)
        </Text>

        <Text style={styles.sectionTitle}>7. Çocukların Gizliliği</Text>
        <Text style={styles.paragraph}>
          Uygulamamız 13 yaşın altındaki çocuklardan bilerek kişisel bilgi
          toplamaz. Eğer 13 yaşın altındaysanız, lütfen ebeveyn veya vasinizin
          izniyle uygulamayı kullanın.
        </Text>

        <Text style={styles.sectionTitle}>8. Haklarınız</Text>
        <Text style={styles.paragraph}>
          KVKK (Kişisel Verilerin Korunması Kanunu) ve GDPR kapsamında
          aşağıdaki haklara sahipsiniz:
        </Text>
        <Text style={styles.bulletPoint}>
          • Kişisel verilerinizin işlenip işlenmediğini öğrenme
        </Text>
        <Text style={styles.bulletPoint}>
          • Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme
        </Text>
        <Text style={styles.bulletPoint}>
          • Kişisel verilerinizin silinmesini veya yok edilmesini isteme
        </Text>
        <Text style={styles.bulletPoint}>
          • Kişisel verilerinizin düzeltilmesini isteme
        </Text>

        <Text style={styles.sectionTitle}>9. Hesap Silme</Text>
        <Text style={styles.paragraph}>
          Hesabınızı ve tüm verilerinizi silmek isterseniz, Ayarlar {">"} Veri
          Yönetimi {">"} Uygulama Verilerini Sıfırla seçeneğini kullanabilir
          veya info@edataspinar.com adresine e-posta gönderebilirsiniz.
        </Text>

        <Text style={styles.sectionTitle}>10. İletişim</Text>
        <Text style={styles.paragraph}>
          Gizlilik politikamız hakkında sorularınız varsa, bizimle iletişime
          geçebilirsiniz:
        </Text>
        <Text style={styles.bulletPoint}>• E-posta: info@edataspinar.com</Text>
        <Text style={styles.bulletPoint}>• Web: www.edataspinar.com</Text>

        <Text style={styles.sectionTitle}>11. Değişiklikler</Text>
        <Text style={styles.paragraph}>
          Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Değişiklikler
          bu sayfada yayınlanacak ve "Son Güncelleme" tarihi güncellenecektir.
          Önemli değişiklikler için uygulama içi bildirim göndereceğiz.
        </Text>

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
  bold: {
    fontWeight: "700",
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

export default PrivacyPolicyScreen;
