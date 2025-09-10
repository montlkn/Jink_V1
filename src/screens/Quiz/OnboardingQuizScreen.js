import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  calculateAestheticProfile,
  fetchQuizQuestions,
  submitQuizResponse
} from '../../api/quizApi';
import { useAuth } from '../../auth/authProvider';

const { width } = Dimensions.get('window');

const OnboardingQuizScreen = ({ navigation }) => {
  const { session, loading: authLoading } = useAuth();
  
  
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [showQuestionImage, setShowQuestionImage] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    // Track when user starts viewing a question
    setQuestionStartTime(Date.now());
    // Reset whether to show the per-question header image
    const imgUrl = questions?.[currentQuestionIndex]?.image_url;
    setShowQuestionImage(Boolean(imgUrl));
  }, [currentQuestionIndex]);

  const loadQuestions = async () => {
    try {
      const quizQuestions = await fetchQuizQuestions();
      setQuestions(quizQuestions);
      setLoading(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to load quiz questions. Please try again.');
      setLoading(false);
    }
  };

  const handleOptionSelect = async (optionId) => {
    if (!session?.user?.id) return;

    const responseTime = questionStartTime ? Date.now() - questionStartTime : null;
    const currentQuestion = questions[currentQuestionIndex];
    
    console.log(`Question ${currentQuestionIndex + 1} answered in ${responseTime}ms`);
    
    try {
      // Submit the response to Supabase with timing data
      await submitQuizResponse(
        session.user.id, 
        currentQuestion.id, 
        optionId,
        responseTime
      );

      // Update local responses with timing
      const newResponses = {
        ...responses,
        [currentQuestion.id]: {
          optionId,
          responseTime,
          timestamp: Date.now()
        }
      };
      setResponses(newResponses);

      // Move to next question or finish
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        await finishQuiz();
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      Alert.alert('Error', 'Failed to save your response. Please try again.');
    }
  };

  const finishQuiz = async () => {
    if (!session?.user?.id) return;
    
    setSubmitting(true);
    try {
      // Calculate the user's aesthetic profile
      await calculateAestheticProfile(session.user.id);
      
      // Navigation will happen automatically via AppNavigator conditional rendering
      console.log('Quiz completed successfully - profile calculated');
    } catch (error) {
      console.error('Error finishing quiz:', error);
      Alert.alert('Error', 'Failed to calculate your profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  if (loading || authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>
            {authLoading ? 'Loading authentication...' : 'Loading quiz...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (submitting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Calculating your aesthetic profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No quiz questions found.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadQuestions}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aesthetic Profile Quiz</Text>
        <Text style={styles.questionCounter}>
          {currentQuestionIndex + 1} of {questions.length}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      {/* Question Content */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
        
        {/* Question Image (if exists) */}
        {showQuestionImage && (
          <Image 
            source={{ uri: currentQuestion.image_url }} 
            style={styles.questionImage}
            resizeMode="cover"
            onError={() => setShowQuestionImage(false)}
          />
        )}

        {/* Options - 2x2 Grid */}
        <View style={styles.optionsGrid}>
          {currentQuestion.question_options?.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => handleOptionSelect(option.id)}
              activeOpacity={0.8}
            >
              {option.image_url && (
                <Image 
                  source={{ uri: option.image_url }} 
                  style={styles.optionImage}
                  resizeMode="cover"
                />
              )}
              {option.option_text && !option.image_url && (
                <View style={styles.textOptionContent}>
                  <Text style={styles.optionText}>{option.option_text}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.navigationContainer}>
        {currentQuestionIndex > 0 && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={goToPreviousQuestion}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.spacer} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  questionCounter: {
    fontSize: 16,
    color: '#666',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 2,
  },
  questionContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  questionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    lineHeight: 32,
  },
  questionImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    alignSelf: 'center',
    paddingBottom: 100,
    width: width * 0.95,
    marginTop: 8,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    width: (width * 0.95 - 16) / 2, // Much bigger cards
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  optionImage: {
    width: '100%',
    height: (width * 0.95 - 16) / 2 * 1.1, // Much bigger images
  },
  textOptionContent: {
    padding: 16,
    minHeight: (width - 60) / 2 * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  backButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#000',
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default OnboardingQuizScreen;