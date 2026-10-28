import { useEffect, useState } from 'react';
import {
  AppState,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  initializeAuthDatabase,
  saveUserProfile,
} from '../authDatabase';

type Language = 'ua' | 'en';
type AuthError = 'credentials' | 'duration' | 'timer_active' | 'database';

type UserProfile = {
  name: string;
  login: string;
};

const images = [
  {
    source: require('../../assets/images/android-icon-background.png'),
    name: { ua: 'Фон Android', en: 'Android background' },
  },
  {
    source: require('../../assets/images/icon.png'),
    name: { ua: 'Іконка застосунку', en: 'App icon' },
  },
  {
    source: require('../../assets/images/tutorial-web.png'),
    name: { ua: 'Вебінструкція', en: 'Web tutorial' },
  },
  {
    source: require('../../assets/images/react-logo.png'),
    name: { ua: 'Логотип React', en: 'React logo' },
  },
];

export default function Index() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [language, setLanguage] = useState<Language>('en');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [remainingMs, setRemainingMs] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [timerFinished, setTimerFinished] = useState(false);
  const [userName, setUserName] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [authenticatedUser, setAuthenticatedUser] =
    useState<UserProfile | null>(null);
  const [isAuthDatabaseReady, setIsAuthDatabaseReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [messageForWindow, setMessageForWindow] = useState('');
  const [isMessageWindowVisible, setIsMessageWindowVisible] = useState(false);
  const [shareError, setShareError] = useState(false);
  const trimmedMessage = message.trim();
  const durationSeconds =
    (Number.parseInt(minutes || '0', 10) || 0) * 60 +
    (Number.parseInt(seconds || '0', 10) || 0);
  const canStartTimer = durationSeconds > 0 && Number(seconds || 0) < 60;
  const displayedSeconds = Math.ceil(remainingMs / 1000);
  const formattedTime = `${Math.floor(displayedSeconds / 60)
    .toString()
    .padStart(2, '0')}:${(displayedSeconds % 60)
    .toString()
    .padStart(2, '0')}`;

  useEffect(() => {
    let isMounted = true;

    initializeAuthDatabase()
      .then(() => {
        if (isMounted) {
          setIsAuthDatabaseReady(true);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to initialize the authorization database.', error);
        if (isMounted) {
          setAuthError('database');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (endsAt === null) {
      return;
    }

    const updateCountdown = () => {
      const nextRemainingMs = Math.max(0, endsAt - Date.now());
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs === 0) {
        setEndsAt(null);
        setTimerFinished(true);
        if (authenticatedUser) {
          setAuthenticatedUser(null);
          setSessionTimedOut(true);
        }
      }
    };

    const interval = setInterval(updateCountdown, 250);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        updateCountdown();
      }
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [authenticatedUser, endsAt]);

  const startTimer = () => {
    if (!canStartTimer) {
      return;
    }

    const durationMs = durationSeconds * 1000;
    setRemainingMs(durationMs);
    setEndsAt(Date.now() + durationMs);
    setTimerFinished(false);
  };

  const resumeTimer = () => {
    if (remainingMs > 0) {
      setEndsAt(Date.now() + remainingMs);
      setTimerFinished(false);
    }
  };

  const pauseTimer = () => {
    if (endsAt !== null) {
      const nextRemainingMs = Math.max(0, endsAt - Date.now());
      setRemainingMs(nextRemainingMs);
      setEndsAt(null);
      setTimerFinished(nextRemainingMs === 0);
    }
  };

  const resetTimer = () => {
    setEndsAt(null);
    setRemainingMs(0);
    setTimerFinished(false);
  };

  const signIn = async () => {
    const name = userName.trim();
    const login = userLogin.trim();

    if (!name || !login) {
      setAuthError('credentials');
      return;
    }

    if (!canStartTimer) {
      setAuthError('duration');
      return;
    }

    if (endsAt !== null) {
      setAuthError('timer_active');
      return;
    }

    setAuthError(null);
    setIsSigningIn(true);

    try {
      const profile = { name, login };
      await saveUserProfile(profile);
      setAuthenticatedUser(profile);
      setRemainingMs(durationSeconds * 1000);
      setEndsAt(Date.now() + durationSeconds * 1000);
      setTimerFinished(false);
      setSessionTimedOut(false);
    } catch (error) {
      console.error('Failed to save the authorization profile.', error);
      setAuthError('database');
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = () => {
    setAuthenticatedUser(null);
    setEndsAt(null);
    setRemainingMs(0);
    setTimerFinished(false);
    setSessionTimedOut(false);
    setAuthError(null);
  };

  const openMessageWindow = () => {
    setMessageForWindow(trimmedMessage);
    setIsMessageWindowVisible(true);
  };

  const shareMessage = async () => {
    try {
      await Share.share(
        {
          message: trimmedMessage,
          title: language === 'ua' ? 'Повідомлення' : 'Message',
        },
        {
          dialogTitle:
            language === 'ua' ? 'Надіслати повідомлення' : 'Share message',
        }
      );
      setShareError(false);
    } catch {
      setShareError(true);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">
      <View style={styles.languageSelector}>
        {(['ua', 'en'] as const).map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: language === option }}
            style={[
              styles.languageButton,
              language === option && styles.selectedLanguageButton,
            ]}
            onPress={() => setLanguage(option)}
          >
            <Text
              style={[
                styles.languageButtonText,
                language === option && styles.selectedLanguageButtonText,
              ]}
            >
              {option === 'ua' ? 'UA' : 'ENG'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.title}>
        {language === 'ua' ? 'Галерея зображень' : 'Image gallery'}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isDropdownVisible }}
        style={styles.dropdown}
        onPress={() => setIsDropdownVisible(true)}
      >
        <Text style={styles.dropdownText}>
          {images[currentIndex].name[language]}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </Pressable>

      <View style={styles.imageContainer}>
        <Image
          source={images[currentIndex].source}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={images[currentIndex].name[language]}
        />
      </View>

      <Text style={styles.counter}>
        {language === 'ua' ? 'Зображення' : 'Image'} {currentIndex + 1}{' '}
        {language === 'ua' ? 'з' : 'of'} {images.length}
      </Text>

      <View style={styles.timerSection}>
        <Text style={styles.messageTitle}>
          {authenticatedUser
            ? language === 'ua'
              ? 'Час авторизації'
              : 'Authorization time'
            : language === 'ua'
              ? 'Таймер'
              : 'Timer'}
        </Text>
        {!authenticatedUser && (
          <Text style={styles.timerHint}>
            {language === 'ua'
              ? 'Встановіть тривалість перед входом — після її завершення сеанс закінчиться.'
              : 'Set a duration before signing in. The session ends when the timer expires.'}
          </Text>
        )}
        <Text
          accessibilityLabel={
            language === 'ua' ? `Залишилось ${formattedTime}` : `${formattedTime} remaining`
          }
          accessibilityLiveRegion="polite"
          style={styles.timerDisplay}>
          {formattedTime}
        </Text>
        {endsAt === null && !authenticatedUser && (
          <View style={styles.timerInputs}>
            <View style={styles.timerInputGroup}>
              <Text style={styles.timerInputLabel}>
                {language === 'ua' ? 'Хвилини' : 'Minutes'}
              </Text>
              <TextInput
                accessibilityLabel={
                  language === 'ua' ? 'Хвилини таймера' : 'Timer minutes'
                }
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={(value) => setMinutes(value.replace(/\D/g, ''))}
                placeholder="0"
                value={minutes}
                style={styles.timerInput}
              />
            </View>
            <Text style={styles.timerSeparator}>:</Text>
            <View style={styles.timerInputGroup}>
              <Text style={styles.timerInputLabel}>
                {language === 'ua' ? 'Секунди' : 'Seconds'}
              </Text>
              <TextInput
                accessibilityLabel={
                  language === 'ua' ? 'Секунди таймера' : 'Timer seconds'
                }
                keyboardType="number-pad"
                maxLength={2}
                onChangeText={(value) => setSeconds(value.replace(/\D/g, ''))}
                placeholder="0"
                value={seconds}
                style={styles.timerInput}
              />
            </View>
          </View>
        )}
        {authenticatedUser ? (
          <View style={styles.timerActions}>
            <Pressable
              accessibilityRole="button"
              style={[styles.actionButton, styles.resetButton]}
              onPress={signOut}>
              <Text style={styles.actionButtonText}>
                {language === 'ua' ? 'Вийти' : 'Sign out'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.timerActions}>
            {endsAt !== null ? (
              <Pressable
                accessibilityRole="button"
                style={styles.actionButton}
                onPress={pauseTimer}>
                <Text style={styles.actionButtonText}>
                  {language === 'ua' ? 'Пауза' : 'Pause'}
                </Text>
              </Pressable>
            ) : remainingMs > 0 ? (
              <Pressable
                accessibilityRole="button"
                style={styles.actionButton}
                onPress={resumeTimer}>
                <Text style={styles.actionButtonText}>
                  {language === 'ua' ? 'Продовжити' : 'Resume'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canStartTimer }}
                disabled={!canStartTimer}
                style={[
                  styles.actionButton,
                  !canStartTimer && styles.disabledActionButton,
                ]}
                onPress={startTimer}>
                <Text style={styles.actionButtonText}>
                  {language === 'ua' ? 'Старт' : 'Start'}
                </Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              style={[styles.actionButton, styles.resetButton]}
              onPress={resetTimer}>
              <Text style={styles.actionButtonText}>
                {language === 'ua' ? 'Скинути' : 'Reset'}
              </Text>
            </Pressable>
          </View>
        )}
        {timerFinished && (
          <Text accessibilityRole="alert" style={styles.timerFinished}>
            {language === 'ua' ? 'Час вийшов' : 'Time is up'}
          </Text>
        )}
      </View>

      <View style={styles.authSection}>
        <Text style={styles.messageTitle}>
          {language === 'ua' ? 'Авторизація' : 'Authorization'}
        </Text>
        {authenticatedUser ? (
          <Text style={styles.authStatus}>
            {language === 'ua' ? 'Ви увійшли як' : 'Signed in as'}{' '}
            {authenticatedUser.name} ({authenticatedUser.login})
          </Text>
        ) : (
          <>
            <Text style={styles.authHint}>
              {language === 'ua'
                ? 'Введіть ім’я та логін. Логін і ім’я збережуться в локальній базі даних.'
                : 'Enter a name and login. They will be saved in the local database.'}
            </Text>
            <TextInput
              accessibilityLabel={language === 'ua' ? 'Ім’я' : 'Name'}
              autoCapitalize="words"
              editable={!isSigningIn}
              onChangeText={setUserName}
              placeholder={language === 'ua' ? 'Ім’я' : 'Name'}
              value={userName}
              style={styles.authInput}
            />
            <TextInput
              accessibilityLabel={language === 'ua' ? 'Логін' : 'Login'}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSigningIn}
              onChangeText={setUserLogin}
              placeholder={language === 'ua' ? 'Логін' : 'Login'}
              value={userLogin}
              style={styles.authInput}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: !isAuthDatabaseReady || isSigningIn,
              }}
              disabled={!isAuthDatabaseReady || isSigningIn}
              style={[
                styles.actionButton,
                (!isAuthDatabaseReady || isSigningIn) &&
                  styles.disabledActionButton,
              ]}
              onPress={signIn}>
              <Text style={styles.actionButtonText}>
                {isSigningIn
                  ? language === 'ua'
                    ? 'Вхід...'
                    : 'Signing in...'
                  : language === 'ua'
                    ? 'Увійти'
                    : 'Sign in'}
              </Text>
            </Pressable>
          </>
        )}
        {authError && (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {authError === 'credentials'
              ? language === 'ua'
                ? 'Введіть ім’я та логін.'
                : 'Enter both your name and login.'
              : authError === 'duration'
                ? language === 'ua'
                  ? 'Спочатку задайте тривалість у таймері вище.'
                  : 'Set a duration in the timer above first.'
                : authError === 'timer_active'
                  ? language === 'ua'
                    ? 'Скиньте активний таймер перед авторизацією.'
                    : 'Reset the active timer before signing in.'
                  : language === 'ua'
                    ? 'Не вдалося підключитися до бази даних. Перезапустіть застосунок і спробуйте ще раз.'
                    : 'Could not connect to the database. Restart the app and try again.'}
          </Text>
        )}
        {sessionTimedOut && (
          <Text accessibilityRole="alert" style={styles.timerFinished}>
            {language === 'ua'
              ? 'Час авторизації завершився. Увійдіть знову.'
              : 'The authorization session expired. Sign in again.'}
          </Text>
        )}
      </View>

      <View style={styles.messageSection}>
        <Text style={styles.messageTitle}>
          {language === 'ua' ? 'Повідомлення' : 'Message'}
        </Text>
        <TextInput
          accessibilityLabel={
            language === 'ua' ? 'Текст повідомлення' : 'Message text'
          }
          multiline
          textAlignVertical="top"
          placeholder={
            language === 'ua'
              ? 'Введіть текст повідомлення'
              : 'Enter your message'
          }
          placeholderTextColor="#777"
          value={message}
          onChangeText={(text) => {
            setMessage(text);
            setShareError(false);
          }}
          style={styles.messageInput}
        />
        <View style={styles.messageActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !trimmedMessage }}
            disabled={!trimmedMessage}
            style={[
              styles.actionButton,
              !trimmedMessage && styles.disabledActionButton,
            ]}
            onPress={openMessageWindow}>
            <Text style={styles.actionButtonText}>
              {language === 'ua' ? 'Відкрити у вікні' : 'Open in app window'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !trimmedMessage }}
            disabled={!trimmedMessage}
            style={[
              styles.actionButton,
              !trimmedMessage && styles.disabledActionButton,
            ]}
            onPress={shareMessage}>
            <Text style={styles.actionButtonText}>
              {language === 'ua'
                ? 'Надіслати через інший додаток'
                : 'Share with another app'}
            </Text>
          </Pressable>
        </View>
        {shareError && (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {language === 'ua'
              ? 'Не вдалося відкрити меню надсилання. Спробуйте ще раз.'
              : 'Could not open the sharing menu. Please try again.'}
          </Text>
        )}
      </View>

      <Modal
        transparent
        visible={isDropdownVisible}
        animationType="fade"
        onRequestClose={() => setIsDropdownVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsDropdownVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            {images.map((image, index) => (
              <Pressable
                key={image.name.en}
                accessibilityRole="button"
                accessibilityState={{ selected: currentIndex === index }}
                style={[
                  styles.dropdownOption,
                  currentIndex === index && styles.selectedDropdownOption,
                ]}
                onPress={() => {
                  setCurrentIndex(index);
                  setIsDropdownVisible(false);
                }}
              >
                <Image source={image.source} style={styles.optionThumbnail} />
                <Text style={styles.dropdownOptionText}>
                  {image.name[language]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={isMessageWindowVisible}
        animationType="slide"
        onRequestClose={() => setIsMessageWindowVisible(false)}>
        <View style={styles.messageWindowBackdrop}>
          <View style={styles.messageWindow}>
            <Text style={styles.messageWindowTitle}>
              {language === 'ua' ? 'Нове вікно' : 'New window'}
            </Text>
            <Text selectable style={styles.messageWindowText}>
              {messageForWindow}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.closeButton}
              onPress={() => setIsMessageWindowVisible(false)}>
              <Text style={styles.actionButtonText}>
                {language === 'ua' ? 'Закрити' : 'Close'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'stretch',
    padding: 20,
    backgroundColor: '#fff',
  },

  languageSelector: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    gap: 8,
    marginBottom: 24,
  },

  languageButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },

  selectedLanguageButton: {
    backgroundColor: '#007AFF',
  },

  languageButtonText: {
    color: '#333',
    fontWeight: '600',
  },

  selectedLanguageButtonText: {
    color: '#fff',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 30,
    textAlign: 'center',
  },

  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
  },

  dropdownText: {
    fontSize: 16,
    color: '#222',
  },

  dropdownArrow: {
    color: '#666',
  },

  imageContainer: {
    width: '100%',
    height: 350,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  counter: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  timerSection: {
    marginTop: 28,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f4f6f8',
  },

  timerDisplay: {
    marginBottom: 16,
    fontSize: 48,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    textAlign: 'center',
    color: '#222',
  },

  timerHint: {
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },

  timerInputs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 14,
  },

  timerInputGroup: {
    alignItems: 'center',
  },

  timerInputLabel: {
    marginBottom: 6,
    fontSize: 13,
    color: '#555',
  },

  timerInput: {
    width: 88,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 20,
    textAlign: 'center',
    color: '#222',
  },

  timerSeparator: {
    paddingBottom: 8,
    fontSize: 24,
    color: '#444',
  },

  timerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },

  resetButton: {
    backgroundColor: '#60646c',
  },

  timerFinished: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#b00020',
  },

  authSection: {
    marginTop: 28,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f4f6f8',
  },

  authHint: {
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },

  authInput: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#222',
  },

  authStatus: {
    fontSize: 16,
    lineHeight: 24,
    color: '#222',
  },

  messageSection: {
    marginTop: 28,
  },

  messageTitle: {
    marginBottom: 10,
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },

  messageInput: {
    minHeight: 110,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    fontSize: 16,
    color: '#222',
  },

  messageActions: {
    gap: 10,
    marginTop: 12,
  },

  actionButton: {
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#007AFF',
  },

  disabledActionButton: {
    backgroundColor: '#9bbfe8',
  },

  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },

  errorText: {
    marginTop: 10,
    color: '#b00020',
    fontSize: 14,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  dropdownMenu: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
  },

  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
    borderRadius: 8,
  },

  selectedDropdownOption: {
    backgroundColor: '#eaf3ff',
  },

  optionThumbnail: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },

  dropdownOptionText: {
    fontSize: 16,
    color: '#222',
  },

  messageWindowBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },

  messageWindow: {
    minHeight: 220,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
  },

  messageWindowTitle: {
    marginBottom: 16,
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },

  messageWindowText: {
    flex: 1,
    marginBottom: 20,
    fontSize: 17,
    lineHeight: 24,
    color: '#222',
  },

  closeButton: {
    alignItems: 'center',
    padding: 13,
    borderRadius: 10,
    backgroundColor: '#007AFF',
  },
});
