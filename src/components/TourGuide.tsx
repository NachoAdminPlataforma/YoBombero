import React, { useEffect, useState } from 'react';
import { Joyride, CallBackProps, STATUS, Step } from 'react-joyride';
import { User } from '../types';
import { api } from '../lib/api';

interface TourGuideProps {
  currentView: string;
  user: User | null;
  isDarkMode: boolean;
}

export function TourGuide({ currentView, user, isDarkMode }: TourGuideProps) {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    if (!user) return;

    // Check if the user has completed the tour for the current view
    const hasCompletedViewTour = user.tutorialsCompleted?.[currentView];

    if (!hasCompletedViewTour) {
      let viewSteps: Step[] = [];

      switch (currentView) {
        case 'dashboard':
          viewSteps = [
            {
              target: 'body',
              content: '¡Bienvenido a tu panel principal! Aquí podrás ver tu progreso y realizar tests.',
              placement: 'center',
              disableBeacon: true,
            },
            {
              target: '.tour-test-modes',
              content: 'Elige entre el Modo Anki (repaso espaciado inteligente) o el Modo Equilibrado para tus tests.',
              placement: 'bottom',
            },
            {
              target: '.tour-start-test',
              content: '¡Haz clic aquí para empezar tu primer test cuando estés listo!',
              placement: 'top',
            }
          ];
          break;
        case 'create':
          viewSteps = [
            {
              target: 'body',
              content: '¡Bienvenido al Profesor de Legislación! Aquí puedes crear preguntas automáticamente usando Inteligencia Artificial.',
              placement: 'center',
              disableBeacon: true,
            },
            {
              target: '.tour-ai-input',
              content: 'Pega aquí el texto de tu temario o sube un PDF para que la IA genere preguntas basadas en ese contenido.',
              placement: 'bottom',
            },
            {
              target: '.tour-ai-generate',
              content: 'Haz clic aquí para generar las preguntas. ¡Es magia!',
              placement: 'top',
            }
          ];
          break;
        case 'database':
          viewSteps = [
            {
              target: 'body',
              content: 'Esta es tu Base de Datos. Aquí se guardan todas las preguntas que has creado o importado.',
              placement: 'center',
              disableBeacon: true,
            },
            {
              target: '.tour-db-filters',
              content: 'Usa estos filtros para buscar preguntas por tema, clasificación o estado de revisión.',
              placement: 'bottom',
            }
          ];
          break;
        case 'shortcuts':
          viewSteps = [
            {
              target: 'body',
              content: 'Estas son tus Herramientas adicionales. Explora calculadoras, generadores de imágenes y más utilidades para tu estudio.',
              placement: 'center',
              disableBeacon: true,
            }
          ];
          break;
      }

      if (viewSteps.length > 0) {
        setSteps(viewSteps);
        // Small delay to ensure elements are rendered
        setTimeout(() => setRun(true), 500);
      }
    }
  }, [currentView, user]);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status) && user) {
      setRun(false);
      try {
        const updatedTutorials = {
          ...(user.tutorialsCompleted || {}),
          [currentView]: true
        };
        await api.updateUserProfile(user.id, { tutorialsCompleted: updatedTutorials });
      } catch (error) {
        console.error("Error saving tutorial progress:", error);
      }
    }
  };

  if (!run || steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#4f46e5', // indigo-600
          textColor: isDarkMode ? '#f8fafc' : '#0f172a',
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
          arrowColor: isDarkMode ? '#1e293b' : '#ffffff',
          overlayColor: 'rgba(15, 23, 42, 0.7)',
          zIndex: 1000,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#4f46e5',
          borderRadius: '8px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: isDarkMode ? '#94a3b8' : '#64748b',
        },
        buttonSkip: {
          color: isDarkMode ? '#94a3b8' : '#64748b',
        }
      }}
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar tutorial',
      }}
    />
  );
}
