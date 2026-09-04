// ============================================
// IMPORTAR FIREBASE
// ============================================

import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    setDoc,
    addDoc,
    orderBy
} from "firebase/firestore";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";

// ============================================
// CONFIGURACIÓN DE FIREBASE
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyATr2nmqIq6QAm0eC3aO-PbhLaaqlTaNlE",
  authDomain: "transformacion-digital-cf6c0.firebaseapp.com",
  projectId: "transformacion-digital-cf6c0",
  storageBucket: "transformacion-digital-cf6c0.firebasestorage.app",
  messagingSenderId: "160342297932",
  appId: "1:160342297932:web:66421cc33bc3a42e4f13e9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

console.log("✅ Firebase inicializado correctamente");

// ============================================
// VARIABLES GLOBALES
// ============================================

let preguntas = [];
let preguntaActual = 0;
let puntajeTotal = 0;
let respuestasUsuario = [];
let opcionSeleccionada = null;

// ============================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================

async function registrarUsuario(email, password, nombre) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "usuarios", user.uid), {
            nombre: nombre,
            email: email,
            rol: "estudiante",
            activo: true,
            creado: new Date().toISOString()
        });

        console.log("✅ Usuario registrado:", user.uid);
        return { success: true, user: user };
    } catch (error) {
        console.error("❌ Error en registro:", error);
        return { success: false, error: error.message };
    }
}

async function iniciarSesion(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("✅ Usuario autenticado:", user.uid);
        return { success: true, user: user };
    } catch (error) {
        console.error("❌ Error en inicio de sesión:", error);
        return { success: false, error: error.message };
    }
}

async function cerrarSesion() {
    try {
        await signOut(auth);
        console.log("✅ Sesión cerrada");
        return { success: true };
    } catch (error) {
        console.error("❌ Error al cerrar sesión:", error);
        return { success: false, error: error.message };
    }
}

// ============================================
// FUNCIONES DE INTERFAZ - AUTENTICACIÓN
// ============================================

function mostrarMensaje(elementoId, mensaje, tipo) {
    const elemento = document.getElementById(elementoId);
    if (!elemento) return;
    elemento.textContent = mensaje;
    elemento.className = `mensaje mensaje-${tipo}`;
    elemento.classList.remove('hidden');
}

function limpiarMensaje(elementoId) {
    const elemento = document.getElementById(elementoId);
    if (!elemento) return;
    elemento.textContent = '';
    elemento.className = 'mensaje hidden';
}

window.mostrarLogin = function() {
    document.getElementById('seccion-registro').classList.add('hidden');
    document.getElementById('seccion-login').classList.remove('hidden');
};

window.mostrarRegistro = function() {
    document.getElementById('seccion-registro').classList.remove('hidden');
    document.getElementById('seccion-login').classList.add('hidden');
};

function mostrarSimulador() {
    document.getElementById('seccion-auth').classList.add('hidden');
    document.getElementById('seccion-simulador').classList.remove('hidden');
    document.getElementById('seccion-resultados').classList.add('hidden');
}

function mostrarResultados() {
    document.getElementById('seccion-simulador').classList.add('hidden');
    document.getElementById('seccion-resultados').classList.remove('hidden');
}

function mostrarUsuarioAutenticado(userData) {
    const nombreEl = document.getElementById('usuario-nombre');
    if (nombreEl) nombreEl.textContent = userData.nombre || 'Sin nombre';
}

// ============================================
// MANEJAR REGISTRO
// ============================================

window.handleRegistro = async function() {
    const nombre = document.getElementById('registro-nombre').value.trim();
    const email = document.getElementById('registro-email').value.trim();
    const password = document.getElementById('registro-password').value;

    if (!nombre || !email || !password || password.length < 6) {
        mostrarMensaje('registro-mensaje', 'Completa todos los campos (contraseña mínimo 6 caracteres)', 'error');
        return;
    }

    limpiarMensaje('registro-mensaje');

    const resultado = await registrarUsuario(email, password, nombre);

    if (resultado.success) {
        mostrarMensaje('registro-mensaje', '✅ Cuenta creada correctamente', 'exito');
        document.getElementById('registro-nombre').value = '';
        document.getElementById('registro-email').value = '';
        document.getElementById('registro-password').value = '';
        setTimeout(() => {
            limpiarMensaje('registro-mensaje');
            window.mostrarLogin();
        }, 2000);
    } else {
        mostrarMensaje('registro-mensaje', `❌ Error: ${resultado.error}`, 'error');
    }
};

// ============================================
// MANEJAR INICIO DE SESIÓN
// ============================================

window.handleLogin = async function() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        mostrarMensaje('login-mensaje', 'Completa todos los campos', 'error');
        return;
    }

    limpiarMensaje('login-mensaje');

    const resultado = await iniciarSesion(email, password);

    if (resultado.success) {
        mostrarMensaje('login-mensaje', '✅ Inicio de sesión exitoso', 'exito');
    } else {
        let mensajeError = resultado.error;
        if (resultado.error.includes('user-not-found')) {
            mensajeError = 'No existe una cuenta con este correo';
        } else if (resultado.error.includes('wrong-password')) {
            mensajeError = 'Contraseña incorrecta';
        } else if (resultado.error.includes('invalid-email')) {
            mensajeError = 'Correo electrónico inválido';
        } else if (resultado.error.includes('too-many-requests')) {
            mensajeError = 'Demasiados intentos. Espera unos minutos';
        }
        mostrarMensaje('login-mensaje', `❌ Error: ${mensajeError}`, 'error');
    }
};

// ============================================
// MANEJAR CIERRE DE SESIÓN
// ============================================

window.handleCerrarSesion = async function() {
    if (!confirm('¿Estás seguro de que quieres cerrar sesión?')) return;
    const resultado = await cerrarSesion();
    if (resultado.success) {
        window.location.reload();
    } else {
        alert('Error al cerrar sesión: ' + resultado.error);
    }
};

window.cerrarSesionYReiniciar = async function() {
    await cerrarSesion();
    window.location.reload();
};

// ============================================
// CARGAR PREGUNTAS DESDE FIRESTORE
// ============================================

async function cargarPreguntas() {
    try {
        const q = query(collection(db, "preguntas"), orderBy("orden"));
        const snapshot = await getDocs(q);
        
        preguntas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (preguntas.length === 0) {
            console.warn("⚠️ No hay preguntas en Firestore");
            return;
        }
        
        console.log(`✅ ${preguntas.length} preguntas cargadas desde Firestore`);
        iniciarSimulador();
    } catch (error) {
        console.error("❌ Error al cargar preguntas:", error);
        alert("Error al cargar preguntas: " + error.message);
    }
}

// ============================================
// INICIAR SIMULADOR
// ============================================

function iniciarSimulador() {
    preguntaActual = 0;
    puntajeTotal = 0;
    respuestasUsuario = [];
    opcionSeleccionada = null;
    
    document.getElementById('puntaje-total').textContent = '0';
    mostrarPregunta();
}

// ============================================
// MOSTRAR PREGUNTA
// ============================================

function mostrarPregunta() {
    if (preguntaActual >= preguntas.length) {
        mostrarResultadosFinales();
        return;
    }

    const pregunta = preguntas[preguntaActual];
    
    // Actualizar contador
    document.getElementById('pregunta-contador').textContent = 
        `Pregunta ${preguntaActual + 1} de ${preguntas.length}`;
    
    // Actualizar barra de progreso
    const progreso = ((preguntaActual) / preguntas.length) * 100;
    document.getElementById('progreso-fill').style.width = `${progreso}%`;
    
    // Mostrar contexto y título
    document.getElementById('pregunta-contexto').textContent = pregunta.contexto;
    document.getElementById('pregunta-titulo').textContent = pregunta.titulo;
    
    // Generar opciones
    const container = document.getElementById('opciones-container');
    container.innerHTML = '';
    
    pregunta.opciones.forEach((opcion, index) => {
        const btn = document.createElement('button');
        btn.className = 'opcion';
        btn.textContent = `${String.fromCharCode(65 + index)}. ${opcion.texto}`;
        btn.dataset.index = index;
        btn.onclick = () => seleccionarOpcion(index);
        container.appendChild(btn);
    });
    
    // Limpiar retroalimentación
    document.getElementById('retroalimentacion-container').innerHTML = '';
    
    // Deshabilitar botón siguiente
    document.getElementById('btn-siguiente').disabled = true;
    
    // Restablecer selección
    opcionSeleccionada = null;
}

// ============================================
// SELECCIONAR OPCIÓN
// ============================================

function seleccionarOpcion(index) {
    if (opcionSeleccionada !== null) return;
    
    const pregunta = preguntas[preguntaActual];
    const opcion = pregunta.opciones[index];
    const botones = document.querySelectorAll('.opcion');
    
    opcionSeleccionada = index;
    botones.forEach((btn, i) => {
        btn.disabled = true;
        if (i === index) {
            btn.classList.add('seleccionada');
        }
    });
    
    // Mostrar retroalimentación
    const container = document.getElementById('retroalimentacion-container');
    const div = document.createElement('div');
    div.className = `retroalimentacion ${opcion.correcta ? 'exito' : 'error'}`;
    div.textContent = opcion.retroalimentación;
    container.appendChild(div);
    
    // Actualizar puntaje
    if (opcion.correcta) {
        puntajeTotal += opcion.puntaje;
        document.getElementById('puntaje-total').textContent = puntajeTotal;
        document.getElementById('puntaje-actual').textContent = `${puntajeTotal} pts`;
    }
    
    // Guardar respuesta
    respuestasUsuario.push({
        preguntaId: pregunta.id,
        opcionSeleccionada: index,
        correcta: opcion.correcta,
        puntaje: opcion.correcta ? opcion.puntaje : 0
    });
    
    // Habilitar botón siguiente
    document.getElementById('btn-siguiente').disabled = false;
    
    // Marcar correcta/incorrecta visualmente
    botones.forEach((btn, i) => {
        if (pregunta.opciones[i].correcta) {
            btn.classList.add('correcta');
        } else if (i === index && !pregunta.opciones[i].correcta) {
            btn.classList.add('incorrecta');
        }
    });
}

// ============================================
// SIGUIENTE PREGUNTA
// ============================================

window.siguientePregunta = function() {
    preguntaActual++;
    if (preguntaActual < preguntas.length) {
        mostrarPregunta();
    } else {
        mostrarResultadosFinales();
    }
};

// ============================================
// MOSTRAR RESULTADOS FINALES
// ============================================

function mostrarResultadosFinales() {
    guardarRespuestas();
    mostrarResultados();
    
    const totalPosible = preguntas.length * 20;
    const porcentaje = Math.round((puntajeTotal / totalPosible) * 100);
    
    document.getElementById('puntaje-final').textContent = `${puntajeTotal} pts`;
    
    let mensaje = '';
    if (porcentaje >= 80) {
        mensaje = '🌟 ¡Excelente! Eres un líder en gestión del cambio. Has demostrado una visión estratégica excepcional.';
    } else if (porcentaje >= 60) {
        mensaje = '👍 Buen trabajo. Tienes buenas bases en gestión del cambio. Sigue profundizando en comunicación y liderazgo.';
    } else if (porcentaje >= 40) {
        mensaje = '📚 Necesitas reforzar tus conocimientos. Revisa los conceptos de liderazgo del cambio y comunicación efectiva.';
    } else {
        mensaje = '🔄 Te recomendamos revisar los fundamentos de la gestión del cambio. Cada decisión tiene un impacto crítico.';
    }
    document.getElementById('mensaje-final').textContent = mensaje;
    
    const detalle = document.getElementById('detalle-resultados');
    detalle.innerHTML = '';
    
    preguntas.forEach((preg, idx) => {
        const respuesta = respuestasUsuario[idx] || { correcta: false, puntaje: 0 };
        const div = document.createElement('div');
        div.className = 'detalle-item';
        div.innerHTML = `
            <span>${idx + 1}. ${preg.titulo.substring(0, 40)}${preg.titulo.length > 40 ? '...' : ''}</span>
            <span style="color: ${respuesta.correcta ? '#2e7d32' : '#c62828'}">
                ${respuesta.correcta ? '✅' : '❌'} ${respuesta.puntaje || 0} pts
            </span>
        `;
        detalle.appendChild(div);
    });
}

// ============================================
// GUARDAR RESPUESTAS EN FIRESTORE
// ============================================

async function guardarRespuestas() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        for (let i = 0; i < respuestasUsuario.length; i++) {
            const resp = respuestasUsuario[i];
            const pregunta = preguntas[i];
            
            await addDoc(collection(db, "respuestas"), {
                usuarioId: user.uid,
                usuarioNombre: document.getElementById('usuario-nombre').textContent,
                preguntaId: pregunta.id,
                preguntaTitulo: pregunta.titulo,
                opcionSeleccionada: resp.opcionSeleccionada,
                correcta: resp.correcta,
                puntaje: resp.puntaje,
                timestamp: new Date().toISOString()
            });
        }
        console.log("✅ Respuestas guardadas en Firestore");
    } catch (error) {
        console.error("❌ Error al guardar respuestas:", error);
    }
}

// ============================================
// REINICIAR SIMULADOR
// ============================================

window.reiniciarSimulador = function() {
    document.getElementById('seccion-resultados').classList.add('hidden');
    document.getElementById('seccion-simulador').classList.remove('hidden');
    iniciarSimulador();
};

// ============================================
// ESCUCHAR CAMBIOS EN AUTENTICACIÓN
// ============================================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("✅ Usuario autenticado:", user.uid);

        try {
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log("📋 Datos del usuario:", userData);
                mostrarUsuarioAutenticado(userData);
                mostrarSimulador();
                await cargarPreguntas();
            } else {
                console.log("⚠️ El usuario no tiene datos en Firestore");
                window.mostrarLogin();
            }
        } catch (error) {
            console.error("❌ Error al obtener datos:", error);
            window.mostrarLogin();
        }
    } else {
        console.log("🔒 Usuario no autenticado");
        document.getElementById('seccion-auth').classList.remove('hidden');
        document.getElementById('seccion-simulador').classList.add('hidden');
        document.getElementById('seccion-resultados').classList.add('hidden');
        window.mostrarRegistro();
    }
});

console.log("🚀 Gestión del Cambio - Simulador listo");
