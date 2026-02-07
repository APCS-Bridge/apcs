[ Front (Next.js Dashboard) ]
        |
        | 1️⃣ get FCM token
        v
[ Express Backend + PostgreSQL ]
        |
        | store token
        | expose notification API
        |
        v
[ Redis (Queue / PubSub) ]  <───  AI Agent (FastAPI + Agno)
        |
        | job / event
        v
[ Firebase Admin SDK ]
        |
        | push
        v
[ User device / browser ]
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
![alt text](image.png)
![alt text](image-1.png)