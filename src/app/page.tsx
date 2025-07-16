Copiar
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  topic: string;
  difficulty: string;
}

export default function Home() {
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [message, setMessage] = useState('');
  const [quizResults, setQuizResults] = useState<Array<{ question: Question; selectedOption: number; isCorrect: boolean }>>([]);

  useEffect(() => {
    // Load username from localStorage
    const storedUsername = localStorage.getItem('trivia_username');
    if (storedUsername) {
      setUsername(storedUsername);
      const storedUserId = localStorage.getItem('trivia_user_id');
      if (storedUserId) {
        setUserId(storedUserId);
      }
    }
  }, []);

  const handleUsernameSubmit = async () => {
    if (!username.trim()) {
      setMessage('Por favor, introduce un nombre de usuario.');
      return;
    }

    localStorage.setItem('trivia_username', username);

    // Check if user exists in DB, if not, create them
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (userError && userError.code === 'PGRST116') { // No rows found
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ username: username })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        setMessage('Error al crear usuario.');
        return;
      }
      setUserId(newUser.id);
      localStorage.setItem('trivia_user_id', newUser.id);
    } else if (userError) {
      console.error('Error fetching user:', userError);
      setMessage('Error al buscar usuario.');
      return;
    } else if (user) {
      setUserId(user.id);
      localStorage.setItem('trivia_user_id', user.id);
    }

    const currentWeek = 1; // TODO: Implement dynamic week number
    const { data: fetchedQuestions, error: questionsError } = await supabase
      .from('weekly_quizzes')
      .select('id, question_text, options, correct_answer_index, explanation, topic, difficulty')
      .eq('week_number', currentWeek)
      .order('question_number', { ascending: true });

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      setMessage('Error al cargar las preguntas.');
      return;
    }

    if (fetchedQuestions && fetchedQuestions.length > 0) {
      setQuestions(fetchedQuestions);
      setMessage('');
    } else {
      setMessage('No hay preguntas para esta semana. Vuelve más tarde!');
    }
  };

  const handleOptionSelect = (index: number) => {
    setSelectedOption(index);
  };

  const handleNextQuestion = async () => {
    if (selectedOption === null) {
      setMessage('Por favor, selecciona una opción.');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.correct_answer_index;

    setQuizResults(prevResults => [...prevResults, { question: currentQuestion, selectedOption, isCorrect }]);

    if (isCorrect) {
      setScore(score + 1);
    }

    // Save user answer to DB
    if (userId) {
      const { error: answerError } = await supabase.from('user_answers').insert({
        user_id: userId,
        quiz_question_id: currentQuestion.id,
        selected_option_index: selectedOption,
        is_correct: isCorrect,
        time_taken_seconds: 10, // TODO: Implement actual time tracking
      });

      if (answerError) {
        console.error('Error saving answer:', answerError);
        setMessage('Error al guardar respuesta.');
      }
    }

    setSelectedOption(null);
    setMessage('');

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setQuizCompleted(true);
      // TODO: Update total score and time for user in 'users' table
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setQuizCompleted(false);
    setQuizResults([]);
    setMessage('');
  };

  const handleGoToLeaderboard = () => {
    // TODO: Navigate to leaderboard page
    alert('Navegar a la tabla de clasificación (próximamente)!');
  };

  if (!username || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-purple-400">Bienvenido a Friki-Trivia</h1>
          <p className="mb-4 text-gray-300">Introduce tu nombre de usuario para empezar:</p>
          <input
            type="text"
            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tu nombre de usuario"
          />
          <button
            onClick={handleUsernameSubmit}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
          >
            Empezar
          </button>
          {message && <p className="text-red-400 mt-4">{message}</p>}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-purple-400">Friki-Trivia</h1>
          <p className="text-gray-300">Cargando preguntas o no hay preguntas disponibles para esta semana.</p>
          {message && <p className="text-red-400 mt-4">{message}</p>}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-purple-400">Trivial Semanal</h1>
        <p className="text-gray-300 mb-6">Pregunta {currentQuestionIndex + 1} de {questions.length}</p>

        {!quizCompleted ? (
          <div className="mb-6">
            <p className="text-xl font-semibold mb-4">{currentQuestion.question_text}</p>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleOptionSelect(index)}
                  className={`w-full text-left p-3 border rounded-lg transition-colors duration-200
                    ${selectedOption === index ? 'bg-purple-600 border-purple-600 text-white' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}
                  `}
                >
                  {option}
                </button>
              ))}
            </div>
            {message && <p className="text-red-400 mt-4">{message}</p>}
            <button
              onClick={handleNextQuestion}
              className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Siguiente Pregunta' : 'Finalizar Trivial'}
            </button>
          </div>
        ) : (
          <div className="text-gray-300">
            <h2 className="text-2xl font-bold mb-4 text-purple-400">Trivial Completado!</h2>
            <p className="mb-4">Tu puntuación: {score} de {questions.length}</p>
            <p className="mb-6">¡Gracias por jugar, {username}!</p>

            <h3 className="text-xl font-bold mb-3 text-purple-300">Resultados Detallados:</h3>
            <div className="space-y-4">
              {quizResults.map((result, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-700">
                  <p className="font-semibold">{index + 1}. {result.question.question_text}</p>
                  <p className={`text-sm ${result.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    Tu respuesta: {result.question.options[result.selectedOption]} ({result.isCorrect ? 'Correcta' : 'Incorrecta'})
                  </p>
                  {!result.isCorrect && (
                    <p className="text-sm text-green-400">
                      Correcta: {result.question.options[result.question.correct_answer_index]}
                    </p>
                  )}
                  <p className="text-sm text-gray-400 mt-1">
                    Explicación: {result.question.explanation}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleRestartQuiz}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
              >
                Jugar de Nuevo (Solo para pruebas)
              </button>
              <button
                onClick={handleGoToLeaderboard}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
              >
                Ver Tabla de Clasificación
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}