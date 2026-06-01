import { Pressable, StyleSheet, View, StatusBar, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { assets } from '../../assets.js';

import {Text, TextInput} from '../../helpers/AppText.jsx';

const LAST_UPDATED = '24 martie 2026';

export default function LegalScreen() {
    const navigation = useNavigation();
    const route = useRoute();

    const showBack = route.params?.showBack === true;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

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

                <Text style={styles.mainTitle}>1. Termeni și condiții de utilizare</Text>

                <Text style={styles.subtitle}>1.1 Introducere și operator</Text>
                <Text style={styles.paragraph}>
                    Prezentul document reglementează condițiile de utilizare ale aplicației mobile CarFlip, operată de Echipa CarFlip, un proiect independent cu sediul în România (contact: carflip.ro@outlook.com). Prin crearea unui cont sau utilizarea serviciilor noastre, confirmi că ai citit, ai înțeles și ești de acord cu acești termeni în integralitatea lor. Dacă nu ești de acord cu oricare dintre aceste prevederi, te rugăm să nu utilizezi aplicația.
                </Text>

                <Text style={styles.subtitle}>1.2 Descrierea serviciului</Text>
                <Text style={styles.paragraph}>
                    CarFlip este o platformă gratuită și non-profit de anunțuri auto, destinată în principal pieței din România, Republica Moldova, Bulgaria și Serbia. Serviciul permite utilizatorilor să publice anunțuri de vânzare vehicule, să caute vehicule disponibile, să interacționeze prin comentarii și mesaje private, și să gestioneze un profil personal. Aplicația este disponibilă pe dispozitive mobile iOS și Android. Platforma nu percepe niciun cost pentru publicarea sau vizualizarea anunțurilor.
                </Text>

                <Text style={styles.subtitle}>1.3 Vârsta minimă</Text>
                <Text style={styles.paragraph}>
                    Pentru a crea un cont pe CarFlip, trebuie să ai vârsta minimă de 16 ani. Prin crearea contului, confirmi că ai împlinit această vârstă. Dacă ai între 16 și 18 ani, confirmi că ai obținut acordul unui părinte sau tutore legal pentru utilizarea platformei. Echipa CarFlip își rezervă dreptul de a solicita dovada vârstei și de a suspenda conturile utilizatorilor care nu îndeplinesc cerința de vârstă minimă.
                </Text>

                <Text style={styles.subtitle}>1.4 Contul de utilizator</Text>
                <Text style={styles.paragraph}>
                    Pentru a utiliza serviciile CarFlip, este necesară crearea unui cont cu o adresă de email validă și o parolă. Contul este activat prin verificarea unui cod OTP transmis pe email. Ești singurul responsabil pentru păstrarea confidențialității datelor tale de autentificare. Orice activitate desfășurată prin contul tău este responsabilitatea ta exclusivă. Un utilizator poate deține un singur cont activ. În cazul în care suspectezi o utilizare neautorizată a contului, te rugăm să ne contactezi imediat la carflip.ro@outlook.com.
                </Text>

                <Text style={styles.subtitle}>1.5 Publicarea anunțurilor</Text>
                <Text style={styles.paragraph}>
                    Publicarea anunțurilor pe CarFlip este complet gratuită. Fiecare anunț este activ pentru o perioadă de 3 luni de la data publicării, după care expiră automat. Utilizatorul poate reactiva anunțul gratuit din secțiunea de profil. Ștergerea anunțului poate fi realizată oricând din aplicație. Anunțurile trec printr-un proces automat de procesare media (compresie imagini și video) înainte de publicare.
                </Text>

                <Text style={styles.subtitle}>1.6 Rolul platformei</Text>
                <Text style={styles.paragraph}>
                    CarFlip funcționează exclusiv ca intermediar între vânzători și potențialii cumpărători. Platforma nu participă, nu mediază și nu garantează în niciun fel tranzacțiile efectuate între utilizatori. Nu oferim garanții privind exactitatea informațiilor din anunțuri, starea tehnică a vehiculelor, legalitatea documentelor sau buna-credință a utilizatorilor. Orice tranzacție se desfășoară pe propria răspundere a părților implicate.
                </Text>

                <Text style={styles.subtitle}>1.7 Conținut interzis</Text>
                <Text style={styles.paragraph}>
                    Este strict interzisă publicarea următoarelor tipuri de conținut pe platforma CarFlip:
                </Text>
                <Text style={styles.bulletItem}>• Anunțuri pentru vehicule furate sau cu proveniență ilegală</Text>
                <Text style={styles.bulletItem}>• Vehicule fără documente legale valabile</Text>
                <Text style={styles.bulletItem}>• Informații false sau înșelătoare despre vehicule (kilometraj, stare, preț)</Text>
                <Text style={styles.bulletItem}>• Conținut pornografic, obscen, violent sau ofensator</Text>
                <Text style={styles.bulletItem}>• Spam, publicitate neautorizată sau conținut duplicat</Text>
                <Text style={styles.bulletItem}>• Piese contrafăcute sau orice alte produse și servicii ilegale</Text>
                <Text style={styles.bulletItem}>• Conținut care încalcă drepturile de proprietate intelectuală ale terților</Text>
                <Text style={styles.bulletItem}>• Informații personale ale altor persoane fără consimțământul acestora</Text>
                <Text style={styles.paragraph}>
                    Încălcarea acestor reguli poate duce la eliminarea conținutului și suspendarea contului.
                </Text>

                <Text style={styles.subtitle}>1.8 Suspendarea și închiderea conturilor</Text>
                <Text style={styles.paragraph}>
                    Echipa CarFlip își rezervă dreptul de a suspenda sau închide orice cont de utilizator în cazul în care se constată încălcarea prezenților termeni, activitate frauduloasă, publicarea de conținut ilegal, sau orice altă utilizare abuzivă a platformei. Înainte de suspendarea permanentă, utilizatorul va fi notificat prin email cu motivul deciziei, cu excepția cazurilor grave (fraudă, conținut ilegal) care pot necesita acțiune imediată. Utilizatorul poate contesta decizia de suspendare prin email la carflip.ro@outlook.com în termen de 15 zile calendaristice de la notificare.
                </Text>

                <Text style={styles.subtitle}>1.9 Proprietate intelectuală</Text>
                <Text style={styles.paragraph}>
                    Conținutul publicat de utilizatori (fotografii, descrieri, date despre vehicule) rămâne proprietatea acestora. Prin publicarea conținutului pe CarFlip, utilizatorul acordă platformei o licență neexclusivă, gratuită și revocabilă de a afișa, distribui și utiliza acest conținut în cadrul platformei, precum și în materiale promoționale asociate serviciului (capturi de ecran pentru App Store, prezentări).
                </Text>
                <Text style={styles.paragraph}>
                    Brandul CarFlip, designul aplicației, codul sursă și toate elementele grafice asociate sunt proprietatea exclusivă a Echipei CarFlip și nu pot fi reproduse sau utilizate fără acordul scris prealabil.
                </Text>

                <Text style={styles.subtitle}>1.10 Limitarea răspunderii</Text>
                <Text style={styles.paragraph}>
                    CarFlip nu poate fi ținut responsabil pentru pierderi financiare, daune directe sau indirecte rezultate din utilizarea platformei, tranzacții între utilizatori, indisponibilitatea temporară a serviciului, sau acțiunile altor utilizatori. Serviciul este furnizat „ca atare" (as is), fără garanții explicite sau implicite. Această limitare nu afectează drepturile legale ale consumatorilor prevăzute de legislația Uniunii Europene și legislația română.
                </Text>

                <Text style={styles.subtitle}>1.11 Modificarea termenilor</Text>
                <Text style={styles.paragraph}>
                    Echipa CarFlip își rezervă dreptul de a modifica prezenții termeni și condiții. Utilizatorii vor fi notificați prin intermediul aplicației sau prin email cu cel puțin 15 zile înainte de intrarea în vigoare a modificărilor semnificative. Continuarea utilizării serviciului după intrarea în vigoare a modificărilor constituie acceptarea noilor termeni. Dacă nu ești de acord cu modificările, poți șterge contul oricând din secțiunea Securitate a aplicației.
                </Text>

                <View style={styles.sectionDivider} />

                <Text style={styles.mainTitle}>2. Politica de confidențialitate</Text>

                <Text style={styles.paragraph}>
                    Această politică de confidențialitate este elaborată în conformitate cu Regulamentul (UE) 2016/679 privind protecția persoanelor fizice în ceea ce privește prelucrarea datelor cu caracter personal (GDPR) și legislația română aplicabilă.
                </Text>

                <Text style={styles.subtitle}>2.1 Operatorul de date</Text>
                <Text style={styles.paragraph}>
                    Operatorul de date cu caracter personal este Echipa CarFlip, cu sediul în România. Pentru orice solicitări legate de datele tale personale, ne poți contacta la: carflip.ro@outlook.com. Ne angajăm să răspundem oricărei solicitări în termen de maximum 30 de zile calendaristice.
                </Text>

                <Text style={styles.subtitle}>2.2 Date colectate</Text>
                <Text style={styles.paragraph}>
                    În cadrul utilizării aplicației CarFlip, colectăm următoarele categorii de date personale:
                </Text>
                <Text style={styles.bulletItem}>• Informații de cont: nume de utilizator, adresă de email, parolă (stocată exclusiv în formă criptată cu algoritmul bcrypt)</Text>
                <Text style={styles.bulletItem}>• Conținut generat de utilizator: anunțuri, fotografii, videoclipuri, descrieri, comentarii, mesaje private</Text>
                <Text style={styles.bulletItem}>• Date tehnice: token-uri de notificare Firebase Cloud Messaging (FCM), tipul dispozitivului</Text>
                <Text style={styles.bulletItem}>• Date de utilizare: interacțiuni cu anunțurile (vizualizări, aprecieri), postări vizualizate</Text>
                <Text style={styles.paragraph}>
                    Nu colectăm date de localizare GPS, nu utilizăm cookie-uri, nu implementăm tehnologii de tracking comportamental și nu colectăm date biometrice.
                </Text>

                <Text style={styles.subtitle}>2.3 Scopul și baza legală a prelucrării</Text>
                <Text style={styles.paragraph}>
                    Datele personale sunt prelucrate în următoarele scopuri și pe baza următoarelor temeiuri legale (conform Art. 6 GDPR):
                </Text>
                <Text style={styles.bulletItem}>• Executarea contractului (Art. 6 alin. 1 lit. b): furnizarea serviciului, gestionarea contului, publicarea și afișarea anunțurilor, funcționalitatea de mesagerie și comentarii</Text>
                <Text style={styles.bulletItem}>• Interesul legitim (Art. 6 alin. 1 lit. f): prevenirea fraudei și a utilizării abuzive, îmbunătățirea serviciului, funcționalitatea de feed personalizat (postări nevăzute vs. văzute)</Text>
                <Text style={styles.bulletItem}>• Consimțământul (Art. 6 alin. 1 lit. a): trimiterea notificărilor push (care poate fi retras oricând din setările dispozitivului)</Text>
                <Text style={styles.bulletItem}>• Obligația legală (Art. 6 alin. 1 lit. c): răspunsul la solicitări ale autorităților competente, dacă este cazul</Text>
                <Text style={styles.paragraph}>
                    Nu trimitem email-uri de marketing sau newsletter. Toate comunicările prin email sunt strict tranzacționale (coduri de verificare, resetare parolă, notificări privind contul).
                </Text>

                <Text style={styles.subtitle}>2.4 Stocarea și securitatea datelor</Text>
                <Text style={styles.paragraph}>
                    Datele sunt stocate pe infrastructură situată în Spațiul Economic European (SEE):
                </Text>
                <Text style={styles.bulletItem}>• Baza de date (MongoDB Atlas) — regiune UE</Text>
                <Text style={styles.bulletItem}>• Serverul aplicației (Hetzner) — Falkenstein, Germania</Text>
                <Text style={styles.bulletItem}>• Fișiere media (Cloudflare R2) — rețeaua globală Cloudflare, cu respectarea clauzelor contractuale standard pentru transferuri internaționale</Text>
                <Text style={styles.paragraph}>
                    Măsuri de securitate implementate: criptarea parolelor cu bcrypt, comunicații HTTPS/TLS, acces restricționat la servere, rate limiting pe API, sistem de blocare utilizatori.
                </Text>

                <Text style={styles.subtitle}>2.5 Perioada de retenție a datelor</Text>
                <Text style={styles.paragraph}>
                    Datele personale sunt păstrate conform următoarelor perioade:
                </Text>
                <Text style={styles.bulletItem}>• Contul și datele asociate (anunțuri, comentarii, aprecieri): pe durata existenței contului</Text>
                <Text style={styles.bulletItem}>• Mesajele private: șterse automat după 30 de zile calendaristice de la trimitere (ștergere automată și ireversibilă)</Text>
                <Text style={styles.bulletItem}>• Anunțurile expirate: dezactivate automat după 3 luni, datele rămân asociate contului până la ștergerea manuală sau ștergerea contului</Text>
                <Text style={styles.bulletItem}>• După ștergerea contului: toate datele asociate (anunțuri, comentarii, mesaje, profil, fișiere media) sunt șterse automat și definitiv. Datele anonimizate pot fi păstrate temporar în backup-uri de securitate pentru maximum 30 de zile</Text>

                <Text style={styles.subtitle}>2.6 Partajarea datelor cu terți</Text>
                <Text style={styles.paragraph}>
                    CarFlip nu vinde, nu închiriază și nu distribuie datele personale ale utilizatorilor către terți în scopuri comerciale. Datele sunt partajate exclusiv cu următorii furnizori de servicii (împuterniciți), strict în scopul funcționării platformei:
                </Text>
                <Text style={styles.bulletItem}>• Mailgun (Sinch Email) — transmiterea email-urilor tranzacționale</Text>
                <Text style={styles.bulletItem}>• Firebase Cloud Messaging (Google) — transmiterea notificărilor push</Text>
                <Text style={styles.bulletItem}>• Cloudflare R2 (Cloudflare, Inc.) — stocarea fișierelor media (imagini, videoclipuri)</Text>
                <Text style={styles.bulletItem}>• MongoDB Atlas (MongoDB, Inc.) — stocarea bazei de date</Text>
                <Text style={styles.paragraph}>
                    Toți furnizorii menționați respectă GDPR și/sau au implementate clauze contractuale standard pentru protecția datelor.
                </Text>

                <Text style={styles.subtitle}>2.7 Drepturile utilizatorului conform GDPR</Text>
                <Text style={styles.paragraph}>
                    În conformitate cu Regulamentul (UE) 2016/679 (GDPR), ai următoarele drepturi privind datele tale personale:
                </Text>
                <Text style={styles.bulletItem}>• Dreptul de acces (Art. 15): poți solicita o copie a tuturor datelor personale pe care le deținem despre tine</Text>
                <Text style={styles.bulletItem}>• Dreptul la rectificare (Art. 16): poți corecta informațiile incorecte prin actualizarea profilului din aplicație sau prin solicitare la adresa de email de contact</Text>
                <Text style={styles.bulletItem}>• Dreptul la ștergere (Art. 17): poți solicita ștergerea completă a contului și a tuturor datelor asociate, disponibilă direct din aplicație (Profil → Securitate → Ștergere cont)</Text>
                <Text style={styles.bulletItem}>• Dreptul la restricționarea prelucrării (Art. 18): poți solicita restricționarea prelucrării datelor tale în anumite circumstanțe</Text>
                <Text style={styles.bulletItem}>• Dreptul la portabilitatea datelor (Art. 20): poți solicita datele tale într-un format structurat, utilizat în mod curent și care poate fi citit automat (JSON)</Text>
                <Text style={styles.bulletItem}>• Dreptul la opoziție (Art. 21): poți obiecta în orice moment la prelucrarea datelor bazată pe interesul nostru legitim</Text>
                <Text style={styles.bulletItem}>• Dreptul de retragere a consimțământului (Art. 7): poți retrage consimțământul pentru notificările push oricând, din setările dispozitivului</Text>
                <Text style={styles.paragraph}>
                    Pentru exercitarea oricăruia dintre aceste drepturi, contactează-ne la carflip.ro@outlook.com. Vom răspunde în termen de maximum 30 de zile calendaristice.
                </Text>

                <Text style={styles.subtitle}>2.8 Plângeri</Text>
                <Text style={styles.paragraph}>
                    Dacă consideri că prelucrarea datelor tale personale încalcă prevederile GDPR, ai dreptul de a depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), cu sediul în Bd. G-ral. Gheorghe Magheru nr. 28-30, Sector 1, București, 010336, România. Website: www.dataprotection.ro.
                </Text>

                <Text style={styles.subtitle}>2.9 Transferuri internaționale de date</Text>
                <Text style={styles.paragraph}>
                    Datele personale sunt stocate și prelucrate preponderent în cadrul Spațiului Economic European (SEE). În cazul în care anumiți furnizori de servicii (Cloudflare, Google/Firebase) prelucrează date în afara SEE, aceștia asigură un nivel adecvat de protecție prin clauze contractuale standard aprobate de Comisia Europeană sau prin certificări recunoscute (EU-US Data Privacy Framework).
                </Text>

                <View style={styles.sectionDivider} />

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
                    <Text style={styles.ruleBold}>Folosește fotografii reale.</Text> Fotografiile trebuie să fie ale vehiculului efectiv vândut. Utilizarea imaginilor descărcate de pe internet, a fotografiilor de stoc sau a imaginilor manipulate este interzisă.
                </Text>

                <Text style={styles.ruleItem}>
                    <Text style={styles.ruleBold}>Prețuri reale.</Text> Nu publica prețuri artificiale, simbolice (de exemplu 1€) sau înșelătoare cu scopul de a atrage atenția.
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
                    Încălcarea regulilor comunității poate duce la avertisment, suspendarea temporară sau permanentă a contului, în funcție de gravitatea și frecvența abaterilor. Deciziile de suspendare pot fi contestate conform secțiunii 1.8.
                </Text>

                <View style={styles.sectionDivider} />

                <Text style={styles.mainTitle}>4. Dispoziții finale</Text>

                <Text style={styles.paragraph}>
                    Prezenții termeni și condiții, politica de confidențialitate și regulile comunității constituie un acord integral între utilizator și Echipa CarFlip privind utilizarea platformei.
                </Text>
                <Text style={styles.paragraph}>
                    Legea aplicabilă este legea română, completată cu prevederile Regulamentului (UE) 2016/679 (GDPR) și ale celorlalte reglementări europene în materie de protecție a datelor cu caracter personal. Orice litigiu va fi soluționat pe cale amiabilă, iar în cazul în care acest lucru nu este posibil, de către instanțele competente din România.
                </Text>
                <Text style={styles.paragraph}>
                    Prezentul document nu afectează drepturile conferite de legislația de protecție a consumatorilor din Uniunea Europeană.
                </Text>
                <Text style={styles.paragraph}>
                    Pentru orice întrebări, nelămuriri sau solicitări legate de conținutul acestui document, ne poți contacta prin intermediul secțiunii Contact din aplicație sau la adresa: carflip.ro@outlook.com
                </Text>

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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 50,
    },
    lastUpdated: {
        fontSize: 12,
        color: '#AAAAAA',
        marginBottom: 24,
    },
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
    sectionDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 32,
    },
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
