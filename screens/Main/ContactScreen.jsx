import { Pressable, StyleSheet, View, Text, StatusBar, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const CONTACT_EMAIL = 'carfip.ro@outlook.com';

export default function ContactScreen() {
    const navigation = useNavigation();

    const handleEmailPress = () => {
        Linking.openURL(`mailto:${CONTACT_EMAIL}`);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Contact</Text>
                <Pressable onPress={() => navigation.openDrawer()} hitSlop={16} style={styles.menuButton}>
                    <View style={styles.menuIconBox}>
                        <View style={styles.menuLine} />
                        <View style={styles.menuLine} />
                        <View style={styles.menuLine} />
                    </View>
                </Pressable>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >

                <Text style={styles.sectionLabel}>Contactează-ne</Text>
                <Text style={styles.contactText}>
                    Dacă întâmpini o problemă legată de utilizarea aplicației, ai o întrebare sau dorești să ne transmiți o sugestie, nu ezita să ne scrii. Echipa Car Flip îți va răspunde în cel mai scurt timp posibil.
                </Text>

                <Pressable
                    onPress={handleEmailPress}
                    style={({ pressed }) => [styles.emailBox, pressed && { opacity: 0.8 }]}
                >
                    <Text style={styles.emailLabel}>Email</Text>
                    <Text style={styles.emailAddress}>{CONTACT_EMAIL}</Text>
                    <Text style={styles.emailHint}>Apasă pentru a trimite un email</Text>
                </Pressable>

                <View style={styles.aboutSection}>
                    <Text style={styles.sectionLabel}>Despre Car Flip</Text>
                    <Text style={styles.aboutIntro}>
                        Car Flip este o platformă de anunțuri auto creată cu un singur scop: să simplifice procesul de vânzare și cumpărare a vehiculelor în România.
                    </Text>

                    <View style={styles.valueCard}>
                        <Text style={styles.valueEmoji}>🎯</Text>
                        <View style={styles.valueTextBox}>
                            <Text style={styles.valueTitle}>Experiența utilizatorului pe primul loc</Text>
                            <Text style={styles.valueDescription}>
                                Fiecare funcționalitate este gândită să fie intuitivă și rapidă. Ne dorim ca tu să te concentrezi pe ceea ce contează — să găsești mașina potrivită sau cumpărătorul ideal.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.valueCard}>
                        <Text style={styles.valueEmoji}>💬</Text>
                        <View style={styles.valueTextBox}>
                            <Text style={styles.valueTitle}>Mereu deschiși la dialog</Text>
                            <Text style={styles.valueDescription}>
                                Suntem aici să te ajutăm. Fie că ai o problemă tehnică, o nelămurire sau o idee care ar putea îmbunătăți aplicația, feedback-ul tău este întotdeauna binevenit.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.valueCard}>
                        <Text style={styles.valueEmoji}>🔒</Text>
                        <View style={styles.valueTextBox}>
                            <Text style={styles.valueTitle}>Transparență și siguranță</Text>
                            <Text style={styles.valueDescription}>
                                Datele tale sunt protejate, parolele sunt criptate, iar plățile sunt procesate în siguranță. Credem că încrederea se construiește prin transparență totală.
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.valueCard, { borderBottomWidth: 0 }]}>
                        <Text style={styles.valueEmoji}>🚀</Text>
                        <View style={styles.valueTextBox}>
                            <Text style={styles.valueTitle}>Îmbunătățire continuă</Text>
                            <Text style={styles.valueDescription}>
                                Lucrăm constant la funcționalități noi și la optimizarea celor existente. Fiecare actualizare vine din dorința de a oferi o experiență mai bună.
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerBrand}>CAR FLIP</Text>
                    <Text style={styles.footerTagline}>Drumul tău spre mașina perfectă.</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#081539',
    },
    menuButton: {
        padding: 8,
    },
    menuIconBox: {
        width: 22,
        height: 16,
        justifyContent: 'space-between',
    },
    menuLine: {
        height: 2.5,
        backgroundColor: '#081539',
        borderRadius: 2,
    },

    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 50,
    },

    sectionLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#081539',
        marginBottom: 10,
    },
    contactText: {
        fontSize: 14,
        color: '#666666',
        lineHeight: 21,
        marginBottom: 20,
    },
    emailBox: {
        backgroundColor: '#F5F7FA',
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E1E5EB',
    },
    emailLabel: {
        fontSize: 12,
        color: '#888888',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
    },
    emailAddress: {
        fontSize: 17,
        fontWeight: '700',
        color: '#081539',
        marginBottom: 6,
    },
    emailHint: {
        fontSize: 12,
        color: '#AAAAAA',
    },

    aboutSection: {
        marginTop: 56,
        paddingTop: 32,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    aboutIntro: {
        fontSize: 14,
        color: '#666666',
        lineHeight: 21,
        marginBottom: 24,
    },
    valueCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 18,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F0F0F0',
    },
    valueEmoji: {
        fontSize: 24,
        marginRight: 14,
        marginTop: 2,
    },
    valueTextBox: {
        flex: 1,
    },
    valueTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#081539',
        marginBottom: 4,
    },
    valueDescription: {
        fontSize: 13,
        color: '#888888',
        lineHeight: 19,
    },

    footer: {
        alignItems: 'center',
        marginTop: 40,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    footerBrand: {
        fontSize: 20,
        fontWeight: '900',
        color: '#081539',
        letterSpacing: 2,
        marginBottom: 4,
    },
    footerTagline: {
        fontSize: 13,
        color: '#AAAAAA',
        fontStyle: 'italic',
    },
});
