import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  Prism as SyntaxHighlighter,
} from 'react-syntax-highlighter';

import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import {
  Send,
  StopCircle,
  Trash2,
  BookOpen,
  ChevronDown,
  Cpu,
  FileText,
  X,
  AlertCircle,
  Bot,
} from 'lucide-react';


/* ============================================================
   BACKEND URL
============================================================ */

/*
 * Your Express backend is running on:
 *
 * http://localhost:3001
 *
 * Your chat router is mounted at:
 *
 * /api/chat
 *
 * Therefore:
 *
 * POST http://127.0.0.1:3001/api/chat
 *
 * GET  http://127.0.0.1:3001/api/chat/models
 */

const CHAT_API_URL =
  'http://127.0.0.1:3001/api/chat';

const MODELS_API_URL =
  'http://127.0.0.1:3001/api/chat/models';


/* ============================================================
   FALLBACK MODELS
============================================================ */

const FALLBACK_MODELS = [
  'phi3:mini',
  'gemma3:4b',
  'llama3.2',
  'mistral',
];


/* ============================================================
   SUGGESTIONS
============================================================ */

const SUGGESTIONS = [
  'Summarize this document',
  'What are the key findings?',
  'List all important points',
  'Explain the main concepts',
];


export default function ChatWindow({
  activeDoc,
  setActiveDoc,
  documents = [],
  models = [],
  defaultModel = 'phi3:mini',
}) {

  /* ==========================================================
     STATE
  ========================================================== */

  const [messages, setMessages] =
    useState([]);

  const [input, setInput] =
    useState('');

  const [streaming, setStreaming] =
    useState(false);

  const [sources, setSources] =
    useState([]);

  const [model, setModel] =
    useState(
      defaultModel || 'phi3:mini'
    );

  const [availableModels, setAvailableModels] =
    useState([]);

  const [serverDefaultModel, setServerDefaultModel] =
    useState(
      defaultModel || 'phi3:mini'
    );

  const [showSources, setShowSources] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [inputFocused, setInputFocused] =
    useState(false);


  /* ==========================================================
     REFS
  ========================================================== */

  const bottomRef =
    useRef(null);

  const textareaRef =
    useRef(null);

  const abortRef =
    useRef(null);


  /* ==========================================================
     NORMALIZE MODELS
  ========================================================== */

  const normalizeModels = useCallback(
    list => {

      if (!Array.isArray(list)) {
        return [];
      }

      return list
        .map(item => {

          if (
            typeof item ===
            'string'
          ) {
            return item;
          }

          if (
            item &&
            typeof item ===
            'object'
          ) {
            return (
              item.name ||
              item.model ||
              ''
            );
          }

          return '';

        })
        .filter(Boolean);
    },
    []
  );


  /* ==========================================================
     LOAD MODELS FROM BACKEND
  ========================================================== */

  useEffect(() => {

    let cancelled = false;

    const loadModels = async () => {

      try {

        console.log(
          'Loading models from:',
          MODELS_API_URL
        );

        const response =
          await fetch(
            MODELS_API_URL,
            {
              method: 'GET',
              headers: {
                Accept:
                  'application/json',
              },
            }
          );


        if (!response.ok) {

          throw new Error(
            `Models API failed: ${response.status}`
          );

        }


        const data =
          await response.json();


        console.log(
          'Models API response:',
          data
        );


        const serverModels =
          normalizeModels(
            data?.models
          );


        if (
          !cancelled
        ) {

          if (
            serverModels.length >
            0
          ) {

            setAvailableModels(
              serverModels
            );

          } else {

            setAvailableModels(
              FALLBACK_MODELS
            );

          }


          if (
            data?.default
          ) {

            setServerDefaultModel(
              data.default
            );

            setModel(
              current =>
                serverModels.includes(
                  current
                )
                  ? current
                  : data.default
            );

          }

        }

      } catch (err) {

        console.error(
          'Could not load models:',
          err
        );


        if (
          !cancelled
        ) {

          /*
           * Backend unavailable:
           * keep fallback models.
           */

          setAvailableModels(
            normalizeModels(
              models
            ).length > 0
              ? normalizeModels(
                  models
                )
              : FALLBACK_MODELS
          );

        }

      }

    };


    loadModels();


    return () => {
      cancelled = true;
    };

  }, [
    normalizeModels,
    models,
  ]);


  /* ==========================================================
     SYNC DEFAULT MODEL
  ========================================================== */

  useEffect(() => {

    if (
      defaultModel &&
      !streaming
    ) {

      setModel(
        defaultModel
      );

    }

  }, [
    defaultModel,
    streaming,
  ]);


  /* ==========================================================
     INITIAL MODEL FALLBACK
  ========================================================== */

  useEffect(() => {

    if (
      availableModels.length === 0
    ) {
      return;
    }


    /*
     * If current model exists,
     * keep it.
     */

    if (
      availableModels.includes(
        model
      )
    ) {
      return;
    }


    /*
     * Otherwise use server default.
     */

    if (
      availableModels.includes(
        serverDefaultModel
      )
    ) {

      setModel(
        serverDefaultModel
      );

      return;
    }


    /*
     * Otherwise use first model.
     */

    setModel(
      availableModels[0]
    );

  }, [
    availableModels,
    model,
    serverDefaultModel,
  ]);


  /* ==========================================================
     SCROLL
  ========================================================== */

  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });

  }, [
    messages,
  ]);


  /* ==========================================================
     TEXTAREA AUTO RESIZE
  ========================================================== */

  const autoResize =
    useCallback(() => {

      const textarea =
        textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.style.height =
        'auto';

      textarea.style.height =
        Math.min(
          textarea.scrollHeight,
          160
        ) + 'px';

    }, []);


  /* ==========================================================
     CLEAR CHAT
  ========================================================== */

  const clearChat =
    useCallback(() => {

      if (streaming) {

        abortRef.current?.abort();

      }

      setMessages([]);

      setSources([]);

      setError(null);

      setStreaming(false);

      abortRef.current = null;

    }, [
      streaming,
    ]);


  /* ==========================================================
     STOP STREAMING
  ========================================================== */

  const stopStreaming =
    useCallback(() => {

      abortRef.current?.abort();

      abortRef.current = null;

      setStreaming(false);

    }, []);


  /* ==========================================================
     READ HTTP ERROR
  ========================================================== */

  const readErrorResponse =
    async response => {

      const contentType =
        response.headers.get(
          'content-type'
        ) || '';


      let body = '';


      try {

        body =
          await response.text();

      } catch {

        body = '';

      }


      if (
        !body.trim()
      ) {

        return (
          `Request failed (${response.status} ` +
          `${response.statusText || ''})`
        ).trim();

      }


      if (
        contentType.includes(
          'application/json'
        )
      ) {

        try {

          const data =
            JSON.parse(body);

          return (
            data?.error ||
            data?.message ||
            data?.detail ||
            `Request failed (${response.status})`
          );

        } catch {

          return body;

        }

      }


      return body.slice(
        0,
        1000
      );

    };


  /* ==========================================================
     HANDLE BACKEND PAYLOAD
  ========================================================== */

  const handlePayload =
    useCallback(
      (payload, state) => {

        if (
          !payload ||
          typeof payload !==
            'object'
        ) {

          return;

        }


        /* ------------------------------------------
           ERROR
        ------------------------------------------ */

        if (
          payload.type ===
            'error' ||
          payload.error
        ) {

          throw new Error(
            payload.error ||
            payload.message ||
            'Backend returned an error'
          );

        }


        /* ------------------------------------------
           SOURCES
        ------------------------------------------ */

        if (
          payload.type ===
            'sources' ||
          Array.isArray(
            payload.sources
          )
        ) {

          setSources(
            payload.sources ||
            []
          );

        }


        /* ------------------------------------------
           TEXT
        ------------------------------------------ */

        let text = null;


        /*
         * Custom delta format
         */

        if (
          payload.type ===
            'delta'
        ) {

          text =
            payload.text;

        }


        /*
         * Ollama message format
         */

        if (
          text == null &&
          payload.message &&
          typeof payload
            .message
            .content ===
            'string'
        ) {

          text =
            payload.message.content;

        }


        /*
         * response format
         */

        if (
          text == null &&
          typeof payload.response ===
            'string'
        ) {

          text =
            payload.response;

        }


        /*
         * content format
         */

        if (
          text == null &&
          typeof payload.content ===
            'string'
        ) {

          text =
            payload.content;

        }


        /* ------------------------------------------
           APPEND TEXT
        ------------------------------------------ */

        if (
          typeof text ===
            'string' &&
          text.length > 0
        ) {

          state.fullText +=
            text;


          setMessages(prev =>

            prev.map(
              (
                message,
                index
              ) => {

                if (
                  index !==
                  prev.length - 1
                ) {

                  return message;

                }


                return {
                  ...message,

                  content:
                    state.fullText,

                };

              }
            )

          );

        }


        /* ------------------------------------------
           DONE
        ------------------------------------------ */

        if (
          payload.type ===
            'done' ||
          payload.done === true
        ) {

          state.done = true;

        }

      },
      []
    );


  /* ==========================================================
     PROCESS STREAM
  ========================================================== */

  const processStream =
    useCallback(
      async response => {

        if (
          !response.body
        ) {

          throw new Error(
            'Backend returned an empty response body.'
          );

        }


        const reader =
          response.body.getReader();


        const decoder =
          new TextDecoder(
            'utf-8'
          );


        let buffer = '';


        const state = {
          fullText: '',
          done: false,
        };


        const updateAssistant =
          text => {

            if (
              !text
            ) {
              return;
            }


            state.fullText +=
              text;


            setMessages(prev =>

              prev.map(
                (
                  message,
                  index
                ) => {

                  if (
                    index !==
                    prev.length - 1
                  ) {

                    return message;

                  }


                  return {
                    ...message,
                    content:
                      state.fullText,
                  };

                }
              )

            );

          };


        const processLine =
          line => {

            const trimmed =
              line.trim();


            if (
              !trimmed
            ) {

              return;

            }


            /*
             * Ignore SSE comments.
             */

            if (
              trimmed.startsWith(':')
            ) {

              return;

            }


            let raw =
              trimmed;


            /*
             * SSE:
             *
             * data: {...}
             */

            if (
              raw.startsWith(
                'data:'
              )
            ) {

              raw =
                raw
                  .slice(5)
                  .trim();

            }


            /*
             * Standard SSE ending.
             */

            if (
              raw ===
              '[DONE]'
            ) {

              state.done =
                true;

              return;

            }


            if (
              !raw
            ) {

              return;

            }


            /*
             * Try JSON.
             */

            try {

              const payload =
                JSON.parse(
                  raw
                );


              handlePayload(
                payload,
                state
              );


            } catch (
              parseError
            ) {

              /*
               * Backend may send
               * plain text.
               */

              if (
                parseError instanceof
                  SyntaxError &&
                !raw.startsWith(
                  '{'
                ) &&
                !raw.startsWith(
                  '['
                )
              ) {

                updateAssistant(
                  raw
                );

                return;

              }


              console.warn(
                'Could not parse streaming response:',
                raw
              );

            }

          };


        /* ------------------------------------------
           READ STREAM
        ------------------------------------------ */

        while (
          !state.done
        ) {

          const {
            done,
            value,
          } =
            await reader.read();


          if (
            done
          ) {

            break;

          }


          buffer +=
            decoder.decode(
              value,
              {
                stream: true,
              }
            );


          buffer =
            buffer.replace(
              /\r\n/g,
              '\n'
            );


          const lines =
            buffer.split(
              '\n'
            );


          buffer =
            lines.pop() ||
            '';


          for (
            const line of
            lines
          ) {

            processLine(
              line
            );


            if (
              state.done
            ) {

              break;

            }

          }

        }


        /* ------------------------------------------
           FLUSH
        ------------------------------------------ */

        buffer +=
          decoder.decode();


        if (
          buffer.trim()
        ) {

          processLine(
            buffer
          );

        }


        return state;

      },
      [
        handlePayload,
      ]
    );


  /* ==========================================================
     SEND MESSAGE
  ========================================================== */

  const sendMessage =
    useCallback(
      async () => {

        const text =
          input.trim();


        if (
          !text ||
          streaming
        ) {

          return;

        }


        /* ------------------------------------------
           RESET UI
        ------------------------------------------ */

        setInput('');

        setError(null);

        setSources([]);


        if (
          textareaRef.current
        ) {

          textareaRef.current.style.height =
            'auto';

        }


        /* ------------------------------------------
           USER MESSAGE
        ------------------------------------------ */

        const userMessage = {
          role: 'user',
          content: text,
        };


        const conversation = [
          ...messages,
          userMessage,
        ];


        /* ------------------------------------------
           ADD ASSISTANT PLACEHOLDER
        ------------------------------------------ */

        setMessages([
          ...conversation,
          {
            role: 'assistant',
            content: '',
            streaming: true,
          },
        ]);


        setStreaming(true);


        const controller =
          new AbortController();


        abortRef.current =
          controller;


        try {

          console.log(
            '================================'
          );

          console.log(
            'Sending chat request'
          );

          console.log(
            'URL:',
            CHAT_API_URL
          );

          console.log(
            'Model:',
            model
          );

          console.log(
            'Document:',
            activeDoc?.docId ||
              null
          );

          console.log(
            'Messages:',
            conversation
          );

          console.log(
            '================================'
          );


          /* ------------------------------------------
             API REQUEST
          ------------------------------------------ */

          const response =
            await fetch(
              CHAT_API_URL,
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',

                  Accept:
                    'text/event-stream, ' +
                    'application/x-ndjson, ' +
                    'application/json, ' +
                    'text/plain',
                },

                signal:
                  controller.signal,

                body:
                  JSON.stringify({
                    messages:
                      conversation,

                    model:
                      model ||
                      serverDefaultModel ||
                      'phi3:mini',

                    /*
                     * IMPORTANT:
                     *
                     * If document selected:
                     * docId is sent.
                     *
                     * If General Chat:
                     * docId = null.
                     */

                    docId:
                      activeDoc?.docId ||
                      null,
                  }),
              }
            );


          console.log(
            'Chat response status:',
            response.status
          );


          /* ------------------------------------------
             HTTP ERROR
          ------------------------------------------ */

          if (
            !response.ok
          ) {

            const message =
              await readErrorResponse(
                response
              );


            throw new Error(
              `${response.status} ` +
              `${response.statusText || 'Request failed'}: ` +
              `${message}`
            );

          }


          /* ------------------------------------------
             PROCESS STREAM
          ------------------------------------------ */

          const result =
            await processStream(
              response
            );


          /* ------------------------------------------
             FINALIZE
          ------------------------------------------ */

          setMessages(prev =>

            prev.map(
              (
                message,
                index
              ) => {

                if (
                  index !==
                  prev.length - 1
                ) {

                  return message;

                }


                return {
                  ...message,

                  streaming:
                    false,

                  content:
                    message.content ||
                    result?.fullText ||
                    '_The model returned an empty response._',

                };

              }
            )

          );

        } catch (
          err
        ) {

          console.error(
            'Chat request failed:',
            err
          );


          /* ------------------------------------------
             USER STOPPED
          ------------------------------------------ */

          if (
            err?.name ===
            'AbortError'
          ) {

            setMessages(prev =>

              prev.map(
                (
                  message,
                  index
                ) => {

                  if (
                    index !==
                    prev.length - 1
                  ) {

                    return message;

                  }


                  return {
                    ...message,

                    streaming:
                      false,

                    content:
                      message.content
                        ? message.content +
                          ' _(generation stopped)_'
                        : '_(generation stopped)_',
                  };

                }
              )

            );

          } else {

            /* ------------------------------------------
               REMOVE EMPTY ASSISTANT
            ------------------------------------------ */

            setMessages(prev =>

              prev.filter(
                (
                  message,
                  index
                ) => !(
                  index ===
                    prev.length - 1 &&
                  message.role ===
                    'assistant' &&
                  !message.content
                )
              )

            );


            /* ------------------------------------------
               SHOW ERROR
            ------------------------------------------ */

            let errorMessage =
              err?.message ||
              'Unable to communicate with the backend.';


            /*
             * Make browser CORS/network
             * errors easier to understand.
             */

            if (
              errorMessage ===
              'Failed to fetch'
            ) {

              errorMessage =
                'Failed to fetch the backend. ' +
                'Make sure the Express server is running on ' +
                'http://127.0.0.1:3001 and CORS is enabled.';

            }


            setError(
              errorMessage
            );

          }

        } finally {

          abortRef.current =
            null;

          setStreaming(
            false
          );

        }

      },
      [
        input,
        messages,
        streaming,
        model,
        serverDefaultModel,
        activeDoc,
        processStream,
      ]
    );


  /* ==========================================================
     KEYBOARD
  ========================================================== */

  const handleKeyDown =
    e => {

      if (
        e.key === 'Enter' &&
        !e.shiftKey
      ) {

        e.preventDefault();

        sendMessage();

      }

    };


  /* ==========================================================
     UI
  ========================================================== */

  return (

    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          padding:
            '13px 20px',

          flexShrink: 0,

          background:
            'rgba(13,13,20,0.95)',

          backdropFilter:
            'blur(20px)',

          borderBottom:
            '1px solid rgba(255,255,255,0.06)',

          display: 'flex',

          alignItems:
            'center',

          gap: 12,
        }}
      >

        {/* DOCUMENT */}

        <div
          style={{
            flex: 1,

            display: 'flex',

            alignItems:
              'center',

            gap: 10,
          }}
        >

          <BookOpen
            size={14}
            color="var(--text4)"
          />


          <select
            value={
              activeDoc?.docId ||
              ''
            }

            onChange={e => {

              const doc =
                documents.find(
                  d =>
                    d.docId ===
                    e.target.value
                ) || null;


              setActiveDoc(
                doc
              );


              clearChat();

            }}

            style={{
              background:
                'rgba(255,255,255,0.05)',

              border:
                '1px solid rgba(255,255,255,0.1)',

              borderRadius: 9,

              color:
                'var(--text)',

              fontSize: 13,

              padding:
                '6px 11px',

              outline: 'none',

              cursor: 'pointer',

              fontFamily:
                'var(--font-body)',

              maxWidth: 300,
            }}
          >

            <option
              value=""
              style={{
                background:
                  '#141420',
                color:
                  '#f1f0f5',
              }}
            >
              💬 General Chat
            </option>


            {documents.map(
              doc => (

                <option
                  key={
                    doc.docId
                  }

                  value={
                    doc.docId
                  }

                  style={{
                    background:
                      '#141420',

                    color:
                      '#f1f0f5',
                  }}
                >
                  📄{' '}
                  {doc.docName}
                </option>

              )
            )}

          </select>


          {activeDoc && (

            <span
              style={{
                fontSize: 10,

                fontWeight: 700,

                padding:
                  '2px 9px',

                borderRadius: 20,

                background:
                  'rgba(6,182,212,0.1)',

                color:
                  'var(--cyan)',

                border:
                  '1px solid rgba(6,182,212,0.25)',

                letterSpacing:
                  '0.06em',
              }}
            >
              RAG MODE
            </span>

          )}

        </div>


        {/* MODEL */}

        <div
          style={{
            display: 'flex',

            alignItems:
              'center',

            gap: 6,
          }}
        >

          <Cpu
            size={12}
            color="var(--violet-l)"
          />


          <select
            value={
              model
            }

            onChange={e =>
              setModel(
                e.target.value
              )
            }

            style={{
              background:
                '#141420',

              border:
                '1px solid rgba(124,58,237,0.35)',

              borderRadius: 9,

              color:
                'var(--text)',

              fontSize: 12,

              padding:
                '6px 11px',

              outline: 'none',

              cursor: 'pointer',

              fontFamily:
                'var(--font-mono)',

              fontWeight: 600,

              boxShadow:
                '0 0 12px rgba(124,58,237,0.15)',

              maxWidth: 200,
            }}
          >

            {(
              availableModels.length >
              0
                ? availableModels
                : FALLBACK_MODELS
            ).map(
              (
                modelName,
                index
              ) => (

                <option
                  key={`${modelName}-${index}`}
                  value={
                    modelName
                  }

                  style={{
                    background:
                      '#141420',
                  }}
                >

                  {modelName ===
                  serverDefaultModel
                    ? '★ '
                    : ''}

                  {modelName}

                </option>

              )
            )}

          </select>

        </div>


        {/* SOURCES */}

        {sources.length >
          0 && (

          <button
            onClick={() =>
              setShowSources(
                s => !s
              )
            }

            style={{
              display: 'flex',

              alignItems:
                'center',

              gap: 5,

              padding:
                '5px 12px',

              borderRadius: 9,

              border:
                '1px solid rgba(6,182,212,0.3)',

              background:
                'rgba(6,182,212,0.08)',

              color:
                'var(--cyan)',

              cursor:
                'pointer',

              fontSize: 11.5,

              fontWeight: 700,

              fontFamily:
                'var(--font-body)',
            }}
          >

            <FileText
              size={11}
            />

            {sources.length}{' '}
            sources

            <ChevronDown
              size={11}

              style={{
                transform:
                  showSources
                    ? 'rotate(180deg)'
                    : 'none',

                transition:
                  'transform 0.2s',
              }}
            />

          </button>

        )}


        {/* CLEAR */}

        <button
          onClick={
            clearChat
          }

          style={{
            background:
              'rgba(255,255,255,0.04)',

            border:
              '1px solid rgba(255,255,255,0.08)',

            borderRadius: 9,

            color:
              'var(--text3)',

            padding:
              '6px 11px',

            cursor:
              'pointer',

            fontSize: 11.5,

            display: 'flex',

            alignItems:
              'center',

            gap: 5,

            fontFamily:
              'var(--font-body)',
          }}
        >

          <Trash2
            size={11}
          />

          Clear

        </button>

      </div>


      {/* ======================================================
          SOURCES
      ====================================================== */}

      {showSources &&
        sources.length >
          0 && (

        <div
          style={{
            background:
              'rgba(6,182,212,0.04)',

            borderBottom:
              '1px solid rgba(6,182,212,0.12)',

            padding:
              '12px 20px',

            flexShrink: 0,
          }}
        >

          <div
            style={{
              fontSize: 10,

              color:
                'var(--text4)',

              textTransform:
                'uppercase',

              letterSpacing:
                '0.1em',

              marginBottom: 8,

              fontWeight: 700,
            }}
          >
            Retrieved Context
          </div>


          <div
            style={{
              display:
                'flex',

              gap: 8,

              flexWrap:
                'wrap',
            }}
          >

            {sources.map(
              (
                source,
                i
              ) => (

                <div
                  key={i}

                  style={{
                    padding:
                      '5px 12px',

                    borderRadius: 8,

                    background:
                      'rgba(255,255,255,0.04)',

                    border:
                      '1px solid rgba(255,255,255,0.08)',

                    fontSize: 12,

                    color:
                      'var(--text2)',
                  }}
                >

                  <span
                    style={{
                      color:
                        'var(--cyan)',

                      fontWeight: 700,

                      fontFamily:
                        'var(--font-mono)',
                    }}
                  >
                    #{i + 1}{' '}
                  </span>


                  {source.docName ||
                    source.document ||
                    'Document'}


                  {typeof source.distance ===
                    'number' && (

                    <span
                      style={{
                        color:
                          'var(--text4)',

                        marginLeft: 6,

                        fontFamily:
                          'var(--font-mono)',

                        fontSize:
                          10.5,
                      }}
                    >
                      {(
                        1 -
                        source.distance
                      ).toFixed(
                        3
                      )}
                    </span>

                  )}

                </div>

              )
            )}

          </div>

        </div>

      )}


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div
          style={{
            display:
              'flex',

            alignItems:
              'center',

            gap: 10,

            flexShrink: 0,

            padding:
              '10px 20px',

            background:
              'rgba(239,68,68,0.07)',

            borderBottom:
              '1px solid rgba(239,68,68,0.15)',
          }}
        >

          <AlertCircle
            size={14}
            color="var(--red)"
          />


          <span
            style={{
              flex: 1,

              fontSize: 13,

              color: '#fca5a5',

              whiteSpace:
                'pre-wrap',
            }}
          >
            {error}
          </span>


          <button
            onClick={() =>
              setError(null)
            }

            style={{
              background:
                'none',

              border: 'none',

              cursor:
                'pointer',

              color:
                'var(--text3)',

              display:
                'flex',
            }}
          >

            <X
              size={13}
            />

          </button>

        </div>

      )}


      {/* ======================================================
          MESSAGES
      ====================================================== */}

      <div
        style={{
          flex: 1,

          overflowY:
            'auto',

          padding:
            '28px 0',
        }}
      >

        {messages.length ===
        0 ? (

          <WelcomeState
            activeDoc={
              activeDoc
            }

            onSuggestion={
              suggestion => {

                setInput(
                  suggestion
                );


                setTimeout(
                  () => {

                    textareaRef.current?.focus();

                  },
                  0
                );

              }
            }
          />

        ) : (

          messages.map(
            (
              message,
              index
            ) => (

              <MessageBubble
                key={index}
                msg={message}
              />

            )
          )

        )}


        <div
          ref={
            bottomRef
          }
        />

      </div>


      {/* ======================================================
          INPUT
      ====================================================== */}

      <div
        style={{
          padding:
            '14px 20px 18px',

          flexShrink: 0,

          background:
            'rgba(13,13,20,0.95)',

          backdropFilter:
            'blur(20px)',

          borderTop:
            '1px solid rgba(255,255,255,0.06)',
        }}
      >

        <div
          style={{
            display:
              'flex',

            alignItems:
              'flex-end',

            gap: 10,

            background:
              'rgba(255,255,255,0.04)',

            border:
              `1px solid ${
                inputFocused
                  ? 'rgba(124,58,237,0.5)'
                  : 'rgba(255,255,255,0.09)'
              }`,

            borderRadius: 16,

            padding:
              '12px 14px',

            transition:
              'all 0.2s ease',
          }}
        >

          <textarea
            ref={
              textareaRef
            }

            value={
              input
            }

            onChange={e => {

              setInput(
                e.target.value
              );

              autoResize();

            }}

            onKeyDown={
              handleKeyDown
            }

            onFocus={() =>
              setInputFocused(
                true
              )
            }

            onBlur={() =>
              setInputFocused(
                false
              )
            }

            placeholder={
              activeDoc
                ? `Ask about "${activeDoc.docName}"…`
                : 'Ask anything…'
            }

            rows={1}

            style={{
              flex: 1,

              background:
                'transparent',

              border: 'none',

              outline: 'none',

              color:
                'var(--text)',

              fontSize: 14,

              fontFamily:
                'var(--font-body)',

              resize: 'none',

              lineHeight: 1.6,

              minHeight: 22,

              maxHeight: 160,
            }}
          />


          <button
            onClick={
              streaming
                ? stopStreaming
                : sendMessage
            }

            disabled={
              !streaming &&
              !input.trim()
            }

            style={{
              width: 38,

              height: 38,

              borderRadius: 11,

              border: 'none',

              cursor:
                'pointer',

              background:
                streaming
                  ? 'rgba(239,68,68,0.15)'
                  : 'linear-gradient(135deg, #7c3aed, #06b6d4)',

              color:
                streaming
                  ? 'var(--red)'
                  : '#fff',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              flexShrink: 0,

              opacity:
                !streaming &&
                !input.trim()
                  ? 0.35
                  : 1,
            }}
          >

            {streaming ? (

              <StopCircle
                size={16}
              />

            ) : (

              <Send
                size={14}
              />

            )}

          </button>

        </div>


        <div
          style={{
            textAlign:
              'center',

            fontSize: 11,

            color:
              'var(--text4)',

            marginTop: 8,
          }}
        >

          Enter to send ·
          Shift+Enter for new
          line ·{' '}

          {activeDoc
            ? '⚡ RAG active'
            : '💬 General mode'}

        </div>

      </div>

    </div>

  );
}


/* ============================================================
   WELCOME
============================================================ */

function WelcomeState({
  activeDoc,
  onSuggestion,
}) {

  return (

    <div
      style={{
        textAlign:
          'center',

        padding:
          '60px 40px',

        maxWidth: 520,

        margin:
          '0 auto',
      }}
    >

      <div
        style={{
          width: 68,

          height: 68,

          borderRadius: 20,

          margin:
            '0 auto 20px',

          background:
            'linear-gradient(135deg, #7c3aed, #06b6d4)',

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',

          fontSize: 28,

          boxShadow:
            '0 0 40px rgba(124,58,237,0.4)',
        }}
      >
        🧠
      </div>


      <h2
        style={{
          fontFamily:
            'var(--font-display)',

          fontSize: 22,

          fontWeight: 800,

          marginBottom: 10,
        }}
      >
        {activeDoc
          ? `Chatting about "${activeDoc.docName}"`
          : 'KnowledgeVault AI'}
      </h2>


      <p
        style={{
          color:
            'var(--text3)',

          fontSize: 13.5,

          lineHeight: 1.75,

          marginBottom: 28,
        }}
      >

        {activeDoc
          ? 'RAG mode active — answers are grounded in your document using vector similarity search.'
          : 'Select a document to enable RAG mode, or ask general questions below.'}

      </p>


      <div
        style={{
          display:
            'flex',

          flexWrap:
            'wrap',

          gap: 9,

          justifyContent:
            'center',
        }}
      >

        {SUGGESTIONS.map(
          suggestion => (

            <button
              key={
                suggestion
              }

              onClick={() =>
                onSuggestion(
                  suggestion
                )
              }

              style={{
                padding:
                  '9px 18px',

                borderRadius:
                  22,

                background:
                  'rgba(124,58,237,0.08)',

                border:
                  '1px solid rgba(124,58,237,0.2)',

                color:
                  'var(--text2)',

                cursor:
                  'pointer',

                fontSize:
                  12.5,

                fontWeight:
                  500,

                fontFamily:
                  'var(--font-body)',
              }}
            >
              {suggestion}
            </button>

          )
        )}

      </div>

    </div>

  );

}


/* ============================================================
   MESSAGE BUBBLE
============================================================ */

function MessageBubble({
  msg,
}) {

  const isUser =
    msg.role === 'user';


  return (

    <div
      style={{
        display:
          'flex',

        gap: 13,

        padding:
          '6px 28px',

        justifyContent:
          isUser
            ? 'flex-end'
            : 'flex-start',
      }}
    >

      {!isUser && (

        <div
          style={{
            width: 32,

            height: 32,

            borderRadius: 10,

            flexShrink: 0,

            marginTop: 3,

            background:
              'linear-gradient(135deg, #7c3aed, #06b6d4)',

            display:
              'flex',

            alignItems:
              'center',

            justifyContent:
              'center',

            boxShadow:
              '0 0 12px rgba(124,58,237,0.3)',
          }}
        >

          <Bot
            size={15}
            color="white"
          />

        </div>

      )}


      <div
        style={{
          maxWidth:
            isUser
              ? '72%'
              : '82%',

          padding:
            isUser
              ? '12px 17px'
              : '4px 0',

          background:
            isUser
              ? 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(124,58,237,0.08))'
              : 'transparent',

          border:
            isUser
              ? '1px solid rgba(124,58,237,0.25)'
              : 'none',

          borderRadius:
            isUser
              ? '18px 18px 5px 18px'
              : 0,

          fontSize: 14,

          lineHeight: 1.75,
        }}
      >

        {isUser ? (

          <span
            style={{
              whiteSpace:
                'pre-wrap',
            }}
          >
            {msg.content}
          </span>

        ) : (

          <>

            {msg.streaming &&
              !msg.content && (

                <div
                  style={{
                    display:
                      'flex',

                    gap: 5,

                    alignItems:
                      'center',

                    padding:
                      '6px 0',
                  }}
                >

                  {[0, 1, 2].map(
                    i => (

                      <span
                        key={i}

                        style={{
                          width: 7,

                          height: 7,

                          borderRadius:
                            '50%',

                          background:
                            'var(--violet-l)',

                          animation:
                            `bounce 1.2s ${i * 0.18}s ease-in-out infinite`,
                        }}
                      />

                    )
                  )}


                  <style>
                    {`
                      @keyframes bounce {
                        0%,60%,100% {
                          transform: translateY(0);
                        }

                        30% {
                          transform: translateY(-7px);
                        }
                      }
                    `}
                  </style>

                </div>

            )}


            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
              ]}

              components={{

                code({
                  inline,
                  className,
                  children,
                  ...props
                }) {

                  const language =
                    /language-(\w+)/.exec(
                      className ||
                        ''
                    )?.[1];


                  if (
                    !inline &&
                    language
                  ) {

                    return (

                      <SyntaxHighlighter
                        style={
                          oneDark
                        }

                        language={
                          language
                        }

                        PreTag="div"

                        customStyle={{
                          borderRadius:
                            10,

                          fontSize:
                            12.5,

                          margin:
                            '10px 0',
                        }}

                        {...props}
                      >
                        {String(
                          children
                        ).replace(
                          /\n$/,
                          ''
                        )}
                      </SyntaxHighlighter>

                    );

                  }


                  return (

                    <code
                      style={{
                        fontFamily:
                          'var(--font-mono)',

                        fontSize:
                          12,

                        background:
                          'rgba(124,58,237,0.1)',

                        padding:
                          '2px 6px',

                        borderRadius:
                          5,

                        color:
                          'var(--violet-l)',
                      }}

                      {...props}
                    >
                      {children}
                    </code>

                  );

                },


                p: ({
                  children,
                }) => (

                  <p
                    style={{
                      marginBottom:
                        10,
                    }}
                  >
                    {children}
                  </p>

                ),


                ul: ({
                  children,
                }) => (

                  <ul
                    style={{
                      paddingLeft:
                        20,

                      marginBottom:
                        10,
                    }}
                  >
                    {children}
                  </ul>

                ),


                ol: ({
                  children,
                }) => (

                  <ol
                    style={{
                      paddingLeft:
                        20,

                      marginBottom:
                        10,
                    }}
                  >
                    {children}
                  </ol>

                ),


                li: ({
                  children,
                }) => (

                  <li
                    style={{
                      marginBottom:
                        5,
                    }}
                  >
                    {children}
                  </li>

                ),


                strong: ({
                  children,
                }) => (

                  <strong
                    style={{
                      color:
                        'var(--violet-l)',

                      fontWeight:
                        700,
                    }}
                  >
                    {children}
                  </strong>

                ),


                h1: ({
                  children,
                }) => (

                  <h1
                    style={{
                      fontSize: 20,

                      margin:
                        '14px 0 8px',
                    }}
                  >
                    {children}
                  </h1>

                ),


                h2: ({
                  children,
                }) => (

                  <h2
                    style={{
                      fontSize: 17,

                      margin:
                        '12px 0 6px',
                    }}
                  >
                    {children}
                  </h2>

                ),


                h3: ({
                  children,
                }) => (

                  <h3
                    style={{
                      fontSize: 15,

                      margin:
                        '10px 0 5px',
                    }}
                  >
                    {children}
                  </h3>

                ),


                blockquote: ({
                  children,
                }) => (

                  <blockquote
                    style={{
                      borderLeft:
                        '3px solid var(--violet)',

                      paddingLeft:
                        14,

                      margin:
                        '10px 0',

                      color:
                        'var(--text2)',
                    }}
                  >
                    {children}
                  </blockquote>

                ),


                table: ({
                  children,
                }) => (

                  <table
                    style={{
                      width:
                        '100%',

                      borderCollapse:
                        'collapse',

                      margin:
                        '10px 0',

                      fontSize: 13,
                    }}
                  >
                    {children}
                  </table>

                ),


                th: ({
                  children,
                }) => (

                  <th
                    style={{
                      padding:
                        '8px 13px',

                      background:
                        'rgba(124,58,237,0.08)',

                      border:
                        '1px solid rgba(255,255,255,0.07)',

                      textAlign:
                        'left',
                    }}
                  >
                    {children}
                  </th>

                ),


                td: ({
                  children,
                }) => (

                  <td
                    style={{
                      padding:
                        '7px 13px',

                      border:
                        '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {children}
                  </td>

                ),

              }}
            >
              {msg.content}
            </ReactMarkdown>

          </>

        )}

      </div>

    </div>

  );

}