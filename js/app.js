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
    apiKey: "AIzaSyBpzZvP3jajz1IMZsteu8qO5W0vrWq673E",
    authDomain: "birdmatch-lima.firebaseapp.com",
    projectId: "birdmatch-lima",
    storageBucket: "birdmatch-lima.firebasestorage.app",
    messagingSenderId: "166632281489",
    appId: "1:166632281489:web:03ec3d3c4b92413aa17630"
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

    const btn = document.querySelector('#seccion-registro .btn');
    btn.disabled = true;
    const resultado = await registrarUsuario(email, password, nombre);
    btn.disabled = false;

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
        let mensajeError = resultado.error;
        if (resultado.error.includes('email-already-in-use')) {
            mensajeError = 'Ya existe una cuenta con este correo. Inicia sesión.';
        } else if (resultado.error.includes('invalid-email')) {
            mensajeError = 'Correo electrónico inválido';
        } else if (resultado.error.includes('weak-password')) {
            mensajeError = 'Contraseña demasiado débil (mínimo 6 caracteres)';
        }
        mostrarMensaje('registro-mensaje', `❌ Error: ${mensajeError}`, 'error');
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

    const btn = document.querySelector('#seccion-login .btn');
    btn.disabled = true;
    const resultado = await iniciarSesion(email, password);
    btn.disabled = false;

    if (resultado.success) {
        mostrarMensaje('login-mensaje', '✅ Inicio de sesión exitoso', 'exito');
    } else {
        let mensajeError = resultado.error;
        if (resultado.error.includes('user-not-found')) {
            mensajeError = 'No existe una cuenta con este correo';
        } else if (resultado.error.includes('wrong-password')) {
            mensajeError = 'Contraseña incorrecta';
        } else if (resultado.error.includes('invalid-credential')) {
            mensajeError = 'Correo o contraseña incorrectos';
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
            document.getElementById('pregunta-titulo').textContent =
                'Aún no hay preguntas configuradas para este simulador.';
            document.getElementById('pregunta-contexto').textContent =
                'Contacta a tu docente si esto no es lo esperado.';
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
    document.getElementById('puntaje-actual').textContent = '0 pts';
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

    document.getElementById('pregunta-contador').textContent =
        `📌 Pregunta ${preguntaActual + 1} de ${preguntas.length}`;

    const progreso = ((preguntaActual) / preguntas.length) * 100;
    document.getElementById('progreso-fill').style.width = `${progreso}%`;

    document.getElementById('pregunta-contexto').textContent = pregunta.contexto;
    document.getElementById('pregunta-titulo').textContent = pregunta.titulo;

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

    document.getElementById('retroalimentacion-container').innerHTML = '';
    document.getElementById('btn-siguiente').disabled = true;
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

    const container = document.getElementById('retroalimentacion-container');
    const div = document.createElement('div');
    div.className = `retroalimentacion ${opcion.correcta ? 'exito' : 'error'}`;
    div.textContent = opcion.retroalimentación;
    container.appendChild(div);

    if (opcion.correcta) {
        puntajeTotal += opcion.puntaje;
        document.getElementById('puntaje-total').textContent = puntajeTotal;
        document.getElementById('puntaje-actual').textContent = `${puntajeTotal} pts`;
    }

    respuestasUsuario.push({
        preguntaId: pregunta.id,
        opcionSeleccionada: index,
        correcta: opcion.correcta,
        puntaje: opcion.correcta ? opcion.puntaje : 0
    });

    const btnSiguiente = document.getElementById('btn-siguiente');
    btnSiguiente.disabled = false;
    btnSiguiente.textContent = (preguntaActual === preguntas.length - 1)
        ? '🏁 Finalizar'
        : '➡️ Siguiente pregunta';

    botones.forEach((btn, i) => {
        if (pregunta.opciones[i].correcta) {
            btn.classList.add('correcta');
        } else if (i === index && !pregunta.opciones[i].correcta) {
            btn.classList.add('incorrecta');
        }
    });

    setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
}

// ============================================
// SIGUIENTE PREGUNTA
// ============================================

window.siguientePregunta = function() {
    preguntaActual++;
    if (preguntaActual < preguntas.length) {
        mostrarPregunta();
        document.getElementById('contenedor-pregunta').scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    const puntajeFinal = document.getElementById('puntaje-final');
    puntajeFinal.textContent = `${puntajeTotal} pts`;
    puntajeFinal.classList.add('pulse');

    let mensaje = '';
    let emoji = '';
    if (porcentaje >= 80) {
        emoji = '🌟';
        mensaje = '¡Excelente! Sigue así.';
    } else if (porcentaje >= 60) {
        emoji = '👍';
        mensaje = 'Buen trabajo, puedes mejorar.';
    } else {
        emoji = '📚';
        mensaje = 'Sigue practicando, lo lograrás.';
    }

    document.getElementById('mensaje-final').textContent = `${emoji} ${mensaje}`;

    const resumenContainer = document.getElementById('resumen-respuestas');
    if (resumenContainer) {
        resumenContainer.innerHTML = '';
        respuestasUsuario.forEach((resp, index) => {
            const pregunta = preguntas[index];
            const div = document.createElement('div');
            div.className = `respuesta-resumen ${resp.correcta ? 'correcta' : 'incorrecta'}`;
            div.textContent = `${index + 1}. ${pregunta.titulo} - ${resp.correcta ? '✅ Correcta' : '❌ Incorrecta'}`;
            resumenContainer.appendChild(div);
        });
    }
}

// ============================================
// GUARDAR RESPUESTAS EN FIRESTORE
// ============================================

async function guardarRespuestas() {
    const user = auth.currentUser;
    
    // Verificar si hay un usuario autenticado
    if (!user) {
        console.warn("⚠️ No hay usuario autenticado. Las respuestas NO se guardaron.");
        return;
    }

    // Verificar que haya respuestas para guardar
    if (!respuestasUsuario || respuestasUsuario.length === 0) {
        console.warn("⚠️ No hay respuestas para guardar.");
        return;
    }

    try {
        console.log(`📝 Guardando ${respuestasUsuario.length} respuestas...`);

        // Guardar cada respuesta como un documento individual en Firestore
        for (const respuesta of respuestasUsuario) {
            await addDoc(collection(db, "respuestas"), {
                userId: user.uid,                    // Identificador del usuario
                userEmail: user.email,               // Email del usuario (opcional)
                preguntaId: respuesta.preguntaId,    // ID de la pregunta
                opcionSeleccionada: respuesta.opcionSeleccionada,
                correcta: respuesta.correcta,
                puntaje: respuesta.puntaje || 0,
                fecha: new Date().toISOString()      // Fecha y hora
            });
        }

        console.log("✅ Respuestas guardadas correctamente en Firestore");
        
        // Mostrar mensaje de éxito en la interfaz (opcional)
        const mensajeFinal = document.getElementById('mensaje-final');
        if (mensajeFinal) {
            mensajeFinal.textContent += " 📁 Respuestas guardadas en la nube.";
        }

    } catch (error) {
        console.error("❌ Error al guardar respuestas:", error);
        
        // Mostrar mensaje de error (opcional)
        const mensajeFinal = document.getElementById('mensaje-final');
        if (mensajeFinal) {
            mensajeFinal.textContent += " ⚠️ No se pudieron guardar las respuestas.";
        }
    }
}
// ============================================
// INICIALIZAR
// ============================================

// Cargar preguntas al iniciar
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Aplicación iniciada");
    cargarPreguntas();
});

// ============================================
// EXPORTAR FUNCIONES PARA USO GLOBAL
// ============================================

window.cargarPreguntas = cargarPreguntas;
window.iniciarSimulador = iniciarSimulador;
window.mostrarPregunta = mostrarPregunta;
window.seleccionarOpcion = seleccionarOpcion;
window.mostrarResultadosFinales = mostrarResultadosFinales;
