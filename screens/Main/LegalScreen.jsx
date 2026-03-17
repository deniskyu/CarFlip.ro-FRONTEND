import { Pressable, StyleSheet, View, Text, StatusBar, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { assets } from '../../assets.js';

const LAST_UPDATED = '13 martie 2026';

export default function LegalScreen() {
    const navigation = useNavigation();
    const route = useRoute();

    // Dacă vii din LoginScreen (stack), showBack = true
    // Dacă vii din Drawer, showBack = false (default)
    const showBack = route.params?.showBack === true;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* HEADER */}
            <View style={styles.header}>
                {showBack ? (
                    <Pressable onPress={() => navigation.goBack()} hitSlop={20} style={styles.backButton}>
                        <Image source={assets.back_arrow} style={styles.backIcon} />
                    </Pressable>
                ) : null}

                <Text style={[styles.headerTitle, showBack && { marginLeft: 12 }]}>
                    Termeni și condiții
                </Text>

                {!showBack ? (
                    <Pressable onPress={() => navigation.openDrawer()} hitSlop={16} style={styles.menuButton}>
                        <View style={styles.menuIconBox}>
                            <View style={styles.menuLine} />
                            <View style={styles.menuLine} />
                            <View style={styles.menuLine} />
                        </View>
                    </Pressable>
                ) : <View style={{ width: 38 }} />}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.lastUpdated}>Ultima actualizare: {LAST_UPDATED}</Text>

                {/* ═══════════════════════════════════════════
                    SECȚIUNEA 1: TERMENI ȘI CONDIȚII
                   ═══════════════════════════════════════════ */}
                <Text style={styles.mainTitle}>1. Termeni și condiții de utilizare</Text>

                <Text style={styles.subtitle}>1.1 Introducere</Text>
                <Text style={styles.paragraph}>
                    Prezentul document reglementează condițiile de utilizare ale aplicației mobile CarFlip, operată de Echipa CarFlip. Prin crearea unui cont sau utilizarea serviciilor noastre, confirmi că ai citit, ai înțeles și ești de acord cu acești termeni în integralitatea lor. Dacă nu ești de acord cu oricare dintre aceste prevederi, te rugăm să nu utilizezi aplicația.
                </Text>

                <Text style={styles.subtitle}>1.2 Descrierea serviciului</Text>
                <Text style={styles.paragraph}>
                    CarFlip este o platformă de anunțuri auto destinată pieței din România. Serviciul permite utilizatorilor să publice anunțuri de vânzare vehicule, să caute vehicule disponibile, să interacționeze prin comentarii și mesaje private, și să gestioneze un profil personal. Aplicația este disponibilă pe dispozitive mobile iOS și Android.
                </Text>

                <Text style={styles.subtitle}>1.3 Contul de utilizator</Text>
                <Text style={styles.paragraph}>
                    Pentru a utiliza serviciile CarFlip, este necesară crearea unui cont cu o adresă de email validă și o parolă. Contul este activat prin verificarea unui cod OTP transmis pe email. Ești singurul responsabil pentru păstrarea confidențialității datelor tale de autentificare. Orice activitate desfășurată prin contul tău este responsabilitatea ta exclusivă. În cazul în care suspectezi o utilizare neautorizată a contului, te rugăm să ne contactezi imediat.
                </Text>

                <Text style={styles.subtitle}>1.4 Publicarea anunțurilor</Text>
                <Text style={styles.paragraph}>
                    Publicarea unui anunț pe CarFlip este gratis. Anularea anunțului poate fi realizată prin ștergerea anunțului sau a contului din aplicație.
                </Text>

                <Text style={styles.subtitle}>1.5 Rolul platformei</Text>
                <Text style={styles.paragraph}>
                    CarFlip funcționează exclusiv ca intermediar între vânzători și potențialii cumpărători. Platforma nu participă, nu mediază și nu garantează în niciun fel tranzacțiile efectuate între utilizatori. Nu oferim garanții privind exactitatea informațiilor din anunțuri, starea tehnică a vehiculelor, legalitatea documentelor sau buna-credință a utilizatorilor. Orice tranzacție se desfășoară pe propria răspundere a părților implicate.
                </Text>

                <Text style={styles.subtitle}>1.6 Conținut interzis</Text>
                <Text style={styles.paragraph}>
                    Este strict interzisă publicarea următoarelor tipuri de conținut pe platforma CarFlip: anunțuri pentru vehicule furate sau cu proveniență ilegală, vehicule fără documente legale valabile, informații false sau înșelătoare despre vehicule, conținut pornografic, obscen sau ofensator, spam, publicitate neautorizată sau conținut duplicat, piese contrafăcute sau orice alte produse și servicii ilegale. Încălcarea acestor reguli poate duce la eliminarea conținutului și suspendarea imediată a contului.
                </Text>

                <Text style={styles.subtitle}>1.7 Suspendarea și închiderea conturilor</Text>
                <Text style={styles.paragraph}>
                    Echipa CarFlip își rezervă dreptul de a suspenda sau închide permanent orice cont de utilizator, fără notificare prealabilă, în cazul în care se constată încălcarea prezentelor termeni, activitate frauduloasă, publicarea de conținut ilegal, sau orice altă utilizare abuzivă a platformei. Decizia de suspendare este la discreția exclusivă a echipei CarFlip.
                </Text>

                <Text style={styles.subtitle}>1.8 Proprietate intelectuală</Text>
                <Text style={styles.paragraph}>
                    Conținutul publicat de utilizatori (fotografii, descrieri, date despre vehicule) rămâne proprietatea acestora. Prin publicarea conținutului pe CarFlip, utilizatorul acordă platformei o licență neexclusivă, gratuită și revocabilă de a afișa, distribui și utiliza acest conținut în cadrul platformei, precum și în materiale promoționale asociate serviciului (capturi de ecran pentru App Store, prezentări, reclame).
                </Text>
                <Text style={styles.paragraph}>
                    Brandul CarFlip, designul aplicației, codul sursă și toate elementele grafice asociate sunt proprietatea exclusivă a Echipei CarFlip și nu pot fi reproduse sau utilizate fără acordul scris prealabil.
                </Text>

                <Text style={styles.subtitle}>1.9 Limitarea răspunderii</Text>
                <Text style={styles.paragraph}>
                    CarFlip nu poate fi ținut responsabil pentru pierderi financiare, daune directe sau indirecte rezultate din utilizarea platformei, tranzacții între utilizatori, indisponibilitatea temporară a serviciului, sau acțiunile altor utilizatori. Serviciul este furnizat „ca atare" (as is), fără garanții explicite sau implicite.
                </Text>

                <Text style={styles.subtitle}>1.10 Modificarea termenilor</Text>
                <Text style={styles.paragraph}>
                    Echipa CarFlip își rezervă dreptul de a modifica prezentele termeni și condiții în orice moment. Modificările intră în vigoare la data publicării lor în aplicație. Continuarea utilizării serviciului după publicarea modificărilor constituie acceptarea noilor termeni.
                </Text>

                <View style={styles.sectionDivider} />

                {/* ═══════════════════════════════════════════
                    SECȚIUNEA 2: POLITICA DE CONFIDENȚIALITATE
                   ═══════════════════════════════════════════ */}
                <Text style={styles.mainTitle}>2. Politica de confidențialitate</Text>

                <Text style={styles.subtitle}>2.1 Date colectate</Text>
                <Text style={styles.paragraph}>
                    În cadrul utilizării aplicației CarFlip, colectăm următoarele categorii de date personale:
                </Text>
                <Text style={styles.bulletItem}>• Informații de cont: nume de utilizator, adresă de email, parolă (stocată exclusiv în formă criptată)</Text>
                <Text style={styles.bulletItem}>• Conținut generat: anunțuri, fotografii, descrieri, comentarii, mesaje private</Text>
                <Text style={styles.bulletItem}>• Date tehnice: token-uri de notificare (Firebase Cloud Messaging), tipul dispozitivului</Text>
                <Text style={styles.bulletItem}>• Date de utilizare: interacțiuni cu anunțurile (vizualizări, aprecieri)</Text>

                <Text style={styles.subtitle}>2.2 Scopul colectării</Text>
                <Text style={styles.paragraph}>
                    Datele personale sunt colectate și prelucrate în următoarele scopuri: furnizarea și îmbunătățirea continuă a serviciului, trimiterea de notificări relevante (comentarii, mesaje, alerte), prevenirea fraudei și a utilizării abuzive a platformei, și comunicări tranzacționale legate de cont (coduri de verificare, resetare parolă).
                </Text>
                <Text style={styles.paragraph}>
                    Nu trimitem email-uri de marketing sau newsletter. Toate comunicările prin email sunt strict tranzacționale.
                </Text>

                <Text style={styles.subtitle}>2.3 Stocarea și securitatea datelor</Text>
                <Text style={styles.paragraph}>
                    Datele sunt stocate pe servere securizate cu acces restricționat. Parolele sunt criptate utilizând algoritmul bcrypt și nu sunt niciodată stocate în text clar. Fotografiile și fișierele video sunt găzduite pe infrastructura Cloudflare R2.
                </Text>

                <Text style={styles.subtitle}>2.4 Mesaje private</Text>
                <Text style={styles.paragraph}>
                    Mesajele private transmise între utilizatori sunt stocate temporar și sunt șterse automat după 30 de zile calendaristice de la trimitere. Această ștergere este automată și ireversibilă.
                </Text>

                <Text style={styles.subtitle}>2.5 Partajarea datelor cu terți</Text>
                <Text style={styles.paragraph}>
                    CarFlip nu vinde, nu închiriază și nu distribuie datele personale ale utilizatorilor. Datele sunt partajate exclusiv cu următorii furnizori de servicii, strict în scopul funcționării platformei:
                </Text>
                <Text style={styles.bulletItem}>• Mailgun — transmiterea email-urilor tranzacționale</Text>
                <Text style={styles.bulletItem}>• Firebase Cloud Messaging — transmiterea notificărilor push</Text>
                <Text style={styles.bulletItem}>• Cloudflare R2 — stocarea fișierelor media</Text>

                <Text style={styles.subtitle}>2.6 Drepturile utilizatorului</Text>
                <Text style={styles.paragraph}>
                    În conformitate cu legislația aplicabilă privind protecția datelor personale, ai dreptul de a: accesa datele tale personale stocate pe platformă, solicita corectarea informațiilor incorecte prin actualizarea profilului, solicita ștergerea completă a contului și a tuturor datelor asociate (disponibilă în secțiunea Securitate a aplicației), și retrage consimțământul pentru notificările push prin setările dispozitivului.
                </Text>

                <Text style={styles.subtitle}>2.7 Cookie-uri și tracking</Text>
                <Text style={styles.paragraph}>
                    Aplicația mobilă CarFlip nu utilizează cookie-uri. Nu implementăm tehnologii de tracking comportamental și nu colectăm date de localizare. Singurele date tehnice colectate sunt cele minime necesare funcționării serviciului de notificări.
                </Text>

                <View style={styles.sectionDivider} />

                {/* ═══════════════════════════════════════════
                    SECȚIUNEA 3: REGULILE COMUNITĂȚII
                   ═══════════════════════════════════════════ */}
                <Text style={styles.mainTitle}>3. Regulile comunității</Text>

                <Text style={styles.paragraph}>
                    Pentru menținerea unui mediu sigur, respectuos și util pentru toți utilizatorii, următoarele reguli sunt obligatorii:
                </Text>

                <Text style={styles.ruleItem}>
                    <Text style={styles.ruleBold}>Respectă ceilalți utilizatori.</Text> Hărțuirea, discriminarea, limbajul ofensator sau amenințările de orice natură sunt interzise, atât în comentarii cât și în mesajele private.
                </Text>

                <Text style={styles.ruleItem}>
                    <Text style={styles.ruleBold}>Publică doar anunțuri reale și corecte.</Text> Toate informațiile despre vehicul (preț, kilometraj, an de fabricație, stare) trebuie să corespundă realității. Anunțurile false sau înșelătoare vor fi eliminate.
                </Text>

                <Text style={styles.ruleItem}>
                    <Text style={styles.ruleBold}>Un vehicul, un anunț.</Text> Nu publica anunțuri duplicate pentru același vehicul. Spamul și conținutul duplicat sunt eliminate automat.
                </Text>

                <Text style={styles.ruleItem}>
                    <Text style={styles.ruleBold}>Folosește fotografii reale.</Text> Fotografiile trebuie să fie ale vehiculului efectiv. Utilizarea imaginilor descărcate de pe internet, a fotografiilor de stoc sau a imaginilor manipulate este interzisă.
                </Text>

                <Text style={styles.ruleItem}>
                    <Text style={styles.ruleBold}>Prețuri reale.</Text> Nu publica prețuri artificiale, simbolice sau înșelătoare cu scopul de a atrage atenția.
                </Text>

                <Text style={styles.ruleItem}>
                    <Text style={styles.ruleBold}>Comentarii relevante și respectuoase.</Text> Comentariile trebuie să fie legate de anunțul respectiv. Publicitatea, spam-ul sau conținutul ofensator în comentarii sunt interzise.
                </Text>

                <Text style={styles.ruleItem}>
                    <Text style={styles.ruleBold}>Nu eluda mecanismele de siguranță.</Text> Încercarea de a ocoli sistemele de blocare, raportare sau orice alte mecanisme de protecție ale platformei este interzisă.
                </Text>

                <Text style={styles.ruleItem}>
                    <Text style={styles.ruleBold}>Raportează conținutul inadecvat.</Text> Dacă observi un anunț, comentariu sau profil care încalcă aceste reguli, te rugăm să-l raportezi folosind funcția de raportare din aplicație.
                </Text>

                <Text style={[styles.paragraph, { marginTop: 16 }]}>
                    Încălcarea repetată sau gravă a regulilor comunității poate duce la suspendarea sau ștergerea permanentă a contului, fără notificare prealabilă și fără drept de apel.
                </Text>

                <View style={styles.sectionDivider} />

                {/* ═══════════════════════════════════════════
                    SECȚIUNEA 4: DISPOZIȚII FINALE
                   ═══════════════════════════════════════════ */}
                <Text style={styles.mainTitle}>4. Dispoziții finale</Text>

                <Text style={styles.paragraph}>
                    Prezentele termeni și condiții, politica de confidențialitate și regulile comunității constituie un acord integral între utilizator și Echipa CarFlip privind utilizarea platformei.
                </Text>
                <Text style={styles.paragraph}>
                    Legea aplicabilă este legea română. Orice litigiu va fi soluționat pe cale amiabilă, iar în cazul în care acest lucru nu este posibil, de către instanțele competente din România.
                </Text>
                <Text style={styles.paragraph}>
                    Pentru orice întrebări, nelămuriri sau solicitări legate de conținutul acestui document, ne poți contacta prin intermediul secțiunii Contact din aplicație.
                </Text>

                {/* FOOTER */}
                <View style={styles.footer}>
                    <Text style={styles.footerBrand}>CAR FLIP</Text>
                    <Text style={styles.footerText}>© {new Date().getFullYear()} CarFlip. Toate drepturile rezervate.</Text>
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

    // ── Header ─────────────────────────────────
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#081539',
        flex: 1,
    },
    backButton: {
        padding: 5,
    },
    backIcon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
        tintColor: '#081539',
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

    // ── Scroll ─────────────────────────────────
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 50,
    },

    // ── Meta ───────────────────────────────────
    lastUpdated: {
        fontSize: 12,
        color: '#AAAAAA',
        marginBottom: 24,
    },

    // ── Titluri ────────────────────────────────
    mainTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#081539',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#081539',
        marginTop: 20,
        marginBottom: 8,
    },

    // ── Text ───────────────────────────────────
    paragraph: {
        fontSize: 14,
        color: '#555555',
        lineHeight: 22,
        marginBottom: 10,
    },
    bulletItem: {
        fontSize: 14,
        color: '#555555',
        lineHeight: 22,
        marginBottom: 6,
        paddingLeft: 8,
    },

    // ── Reguli ─────────────────────────────────
    ruleItem: {
        fontSize: 14,
        color: '#555555',
        lineHeight: 22,
        marginBottom: 14,
    },
    ruleBold: {
        fontWeight: '700',
        color: '#081539',
    },

    // ── Separator ──────────────────────────────
    sectionDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 32,
    },

    // ── Footer ─────────────────────────────────
    footer: {
        alignItems: 'center',
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    footerBrand: {
        fontSize: 20,
        fontWeight: '900',
        color: '#081539',
        letterSpacing: 2,
        marginBottom: 6,
    },
    footerText: {
        fontSize: 12,
        color: '#AAAAAA',
    },
});
