import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabase';
import { parsePilotNumber, isValidPilotNumber, isCategoriaNumerada, processUsedNumbers, getCategoriaTextoFromNumeroConstraint, buildNumeroDuplicadoError } from './_utils/pilotNumbers';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { Resend } from 'resend';

// Cliente público para inscripciones (permite insert sin auth)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabasePublic = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Inicializar Resend para envío de emails
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Función para enviar email con QR
async function sendEmailWithQR(
  email: string,
  nombre: string,
  apellido: string,
  dni: string,
  categoria: string,
  numero: number | null,
  categoriaDetalle: string | null,
  qrDataUrl: string
): Promise<void> {
  console.log('📧 Iniciando envío de email...');
  console.log('📧 RESEND_API_KEY configurada:', !!resendApiKey);
  console.log('📧 Email destino:', email);
  
  if (!resend) {
    console.warn('⚠️ RESEND_API_KEY no configurada, no se enviará email');
    return;
  }

  if (!email || !email.includes('@')) {
    console.error('❌ Email inválido:', email);
    return;
  }

  try {
    // Convertir base64 data URL a buffer
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(base64Data, 'base64');
    console.log('📧 QR convertido a buffer, tamaño:', qrBuffer.length, 'bytes');

    const categoriaTexto = categoria === 'auto' ? 'Auto' : categoria === 'moto' ? 'Moto' : 'Cuatriciclo';
    const numeroTexto = numero ? `#${numero.toString().padStart(2, '0')}` : 'Sin número';
    const categoriaDetalleTexto = categoriaDetalle || 'N/A';

    // Email "from" configurable, por defecto usar el dominio de Resend para pruebas
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Safari Tras las Sierras <onboarding@resend.dev>';
    console.log('📧 Email from:', fromEmail);
    
    console.log('📧 Enviando email con Resend...');
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email], // Resend espera un array
      subject: `✅ Inscripción Confirmada - Safari Tras las Sierras`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #65b330 0%, #5aa02a 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .qr-container {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background: white;
              border-radius: 8px;
              border: 2px solid #65b330;
            }
            .qr-image {
              max-width: 300px;
              height: auto;
            }
            .info-box {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #65b330;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: bold;
              color: #65b330;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Inscripción Confirmada</h1>
            <p>Safari Tras las Sierras - Valle Fértil, San Juan</p>
          </div>
          <div class="content">
            <p>Hola <strong>${nombre} ${apellido}</strong>,</p>
            <p>Tu inscripción ha sido registrada exitosamente. Adjuntamos tu código QR que deberás presentar en la acreditación del evento.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #65b330;">Datos de tu Inscripción</h3>
              <div class="info-row">
                <span class="info-label">DNI:</span>
                <span>${dni}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Categoría:</span>
                <span>${categoriaTexto} - ${categoriaDetalleTexto}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Número de Competencia:</span>
                <span>${numeroTexto}</span>
              </div>
            </div>

            <div class="qr-container">
              <h3 style="color: #65b330; margin-top: 0;">Tu Código QR</h3>
              <p>Presenta este código QR en la acreditación del evento</p>
              <img src="${qrDataUrl}" alt="QR de Inscripción" class="qr-image" />
            </div>

            <p><strong>Importante:</strong></p>
            <ul>
              <li>Guarda este email y el código QR</li>
              <li>Presenta el QR en la acreditación del evento</li>
              <li>También puedes descargar el QR desde la página de inscripción</li>
            </ul>

            <div class="footer">
              <p>¡Te esperamos en el Safari Tras las Sierras!</p>
              <p style="font-size: 12px; color: #999;">Este es un email automático, por favor no respondas.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `qr-inscripcion-${dni}-${numero?.toString().padStart(2, '0') || 'sin-numero'}.png`,
          content: qrBuffer,
        },
      ],
    });

    if (error) {
      console.error('❌ Error enviando email:', JSON.stringify(error, null, 2));
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error?.message);
      throw error;
    }

    console.log('✅ Email enviado exitosamente a:', email);
    console.log('✅ Resend response data:', JSON.stringify(data, null, 2));
  } catch (error: any) {
    console.error('❌ Error en sendEmailWithQR:', error);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    // No lanzar error para no fallar la inscripción si el email falla
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, query } = req;
  const path = url?.split('?')[0] || '';

  if (method === 'POST' && (path === '/api/pilots' || path === '/api/pilots/register')) {
    try {
      const {
        nombre,
        apellido,
        dni,
        email,
        telefono,
        fecha_nacimiento,
        licencia,
        vehiculo_marca,
        vehiculo_modelo,
        vehiculo_patente,
        copiloto_nombre,
        copiloto_dni,
        categoria,
        categoria_auto,
        categoria_moto,
        categoria_moto_china,
        categoria_cuatri,
        tipo_campeonato,
        categoria_enduro,
        categoria_travesia_moto,
        numero: numeroRaw,
        comprobante_pago_url,
        certificado_medico_url,
        edad,
        nacionalidad,
        provincia,
        departamento,
        domicilio,
        telefono_acompanante,
        tiene_licencia
      } = req.body;

      // Normalizar número (puede llegar como string desde el JSON); rango 1-250
      const numero = parsePilotNumber(numeroRaw);
      const numeroValid = numero != null && isValidPilotNumber(numero);

      if (!nombre || !apellido || !dni || !email || !telefono || !fecha_nacimiento) {
        return res.status(400).json({ error: 'Campos requeridos faltantes' });
      }

      if (!categoria) {
        return res.status(400).json({ error: 'El tipo de vehículo (Auto/Moto/Cuatriciclo) es requerido' });
      }

      if (!comprobante_pago_url) {
        return res.status(400).json({ error: 'El comprobante de pago es obligatorio' });
      }

      // Validar campos requeridos para autos
      if (categoria === 'auto') {
        if (!numeroValid) {
          return res.status(400).json({ error: 'Para autos, debes seleccionar un número entre 01 y 250' });
        }
        if (!categoria_auto) {
          return res.status(400).json({ error: 'Para autos, debes seleccionar una categoría' });
        }
        
        // Verificar si el número ya está asignado a otro piloto de AUTO
        // Los números son únicos solo dentro de la misma categoría
        const { data: existingPilot, error: checkError } = await supabaseAdmin
          .from('pilots')
          .select('id, nombre, apellido, dni')
          .eq('numero', numero)
          .eq('categoria', 'auto')
          .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error verificando número:', checkError);
        }
        
        if (existingPilot) {
          return res.status(400).json({ 
            error: `El número ${numero.toString().padStart(2, '0')} ya está asignado a otro piloto de auto (${existingPilot.nombre} ${existingPilot.apellido}). Por favor, selecciona otro número.` 
          });
        }
      }

      // Validar motos: según tipo_campeonato (enduro vs travesías)
      if (categoria === 'moto') {
        const tipoCamp = (tipo_campeonato || '').toLowerCase();
        if (tipoCamp === 'enduro') {
          if (!categoria_enduro) {
            return res.status(400).json({ error: 'Debes seleccionar una categoría del Campeonato Sanjuanino de Enduro' });
          }
        } else if (tipoCamp === 'travesias') {
          if (!categoria_travesia_moto) {
            return res.status(400).json({ error: 'Debes seleccionar una categoría de moto (Travesías/Safari)' });
          }
        } else {
          // Compatibilidad: si no envían tipo_campeonato, aceptar categoria_moto o categoria_moto_china
          const tieneCategoriaMoto = !!categoria_moto;
          const tieneCategoriaMotoChina = !!categoria_moto_china;
          if (!tieneCategoriaMoto && !tieneCategoriaMotoChina && !categoria_enduro && !categoria_travesia_moto) {
            return res.status(400).json({ error: 'Para motos, debes elegir campeonato y categoría' });
          }
        }
      }

      // Validar cuatriciclos (Travesías/Safari). Número no se elige: se asigna después.
      if (categoria === 'cuatri') {
        if (!categoria_cuatri) {
          return res.status(400).json({ error: 'Para cuatriciclos, debes seleccionar una categoría' });
        }
      }

      // Insertar piloto: cuatri usa siempre admin (nueva columna categoria_cuatri); resto según RLS
      const insertClient = categoria === 'cuatri' ? supabaseAdmin : (supabasePublic || supabaseAdmin);
      
      if (!insertClient) {
        console.error('No Supabase client available');
        return res.status(500).json({ error: 'Error de configuración del servidor' });
      }

      const insertData = {
        nombre,
        apellido,
        dni,
        email,
        telefono,
        fecha_nacimiento,
        licencia: licencia || null,
        vehiculo_marca: vehiculo_marca || null,
        vehiculo_modelo: vehiculo_modelo || null,
        vehiculo_patente: vehiculo_patente || null,
        copiloto_nombre: copiloto_nombre || null,
        copiloto_dni: copiloto_dni || null,
        categoria: categoria || null,
        categoria_auto: categoria === 'auto' ? categoria_auto : null,
        categoria_moto: categoria === 'moto' ? (categoria_moto || null) : null,
        categoria_moto_china: categoria === 'moto' ? (categoria_moto_china || null) : null,
        categoria_cuatri: categoria === 'cuatri' ? categoria_cuatri : null,
        tipo_campeonato: tipo_campeonato || null,
        categoria_enduro: categoria_enduro || null,
        categoria_travesia_moto: categoria_travesia_moto || null,
        numero: categoria === 'auto' ? (numero ?? null) : null,
        comprobante_pago_url: comprobante_pago_url || null,
        certificado_medico_url: certificado_medico_url || null,
        edad: edad != null && edad !== '' ? (typeof edad === 'number' ? edad : parseInt(String(edad), 10)) : null,
        nacionalidad: nacionalidad || null,
        provincia: provincia || null,
        departamento: departamento || null,
        domicilio: domicilio || null,
        telefono_acompanante: telefono_acompanante || null,
        tiene_licencia: tiene_licencia === true || tiene_licencia === 'si' || tiene_licencia === 'sí',
        estado: 'pendiente'
      };

      console.log('Attempting to insert pilot with data:', JSON.stringify(insertData, null, 2));

      const { data, error } = await insertClient
        .from('pilots')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Request body:', JSON.stringify(req.body, null, 2));
        
        // Manejar errores de constraint único
        if (error.code === '23505') {
          if (error.message?.includes('dni') || error.message?.includes('pilots_dni_key')) {
            return res.status(400).json({ error: 'Ya existe una inscripción con este DNI. Si ya te inscribiste, verifica tu email o contacta a los organizadores.' });
          }
          if (error.message?.includes('numero') || error.message?.includes('pilots_numero_key') || error.message?.includes('pilots_numero_auto_unique') || error.message?.includes('pilots_numero_moto_unique') || error.message?.includes('pilots_numero_cuatri_unique')) {
            const categoriaTexto = getCategoriaTextoFromNumeroConstraint(error.message || '', categoria);
            return res.status(400).json({
              error: buildNumeroDuplicadoError(numero ?? undefined, categoriaTexto),
            });
          }
        }
        
        // Columna inexistente (migración de cuatriciclos no aplicada en la BD)
        const msg = (error.message || '').toLowerCase();
        if (error.code === '42703' || msg.includes('column') && (msg.includes('does not exist') || msg.includes('no existe') || msg.includes('categoria_cuatri') || msg.includes('categoria_moto_china'))) {
          return res.status(503).json({
            error: 'La base de datos aún no tiene la actualización (cuatriciclos / motos chinas). Por favor, contactá al administrador para que ejecute la migración en Supabase.',
            details: error.message
          });
        }
        
        // Error de RLS (Row Level Security)
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
          return res.status(500).json({ 
            error: 'Error de permisos. Por favor contacta al administrador.',
            details: 'RLS policy violation'
          });
        }
        
        return res.status(500).json({ 
          error: 'Error al procesar la inscripción',
          details: error.message || 'Error desconocido'
        });
      }

      if (!data) {
        console.error('No data returned from insert');
        return res.status(500).json({ error: 'Error al procesar la inscripción: no se recibieron datos' });
      }

      // Generar QR code con información del piloto
      let qrDataUrl: string | null = null;
      try {
        // Obtener la URL base de la aplicación
        // En Vercel, VERCEL_URL ya incluye el protocolo https://
        const baseUrl = process.env.VERCEL_URL 
          ? (process.env.VERCEL_URL.startsWith('http') ? process.env.VERCEL_URL : `https://${process.env.VERCEL_URL}`)
          : process.env.FRONTEND_URL || 'https://safari-tras-las-sierras.vercel.app';
        
        // Crear URL directa a la página de aprobación del piloto
        // Cada inscrito tiene su propia URL única con su ID
        const approvalUrl = `${baseUrl}/admin/approve/${data.id}`;
        
        console.log('🔗 Generando QR con URL única para piloto:', data.id);
        console.log('🔗 URL de aprobación:', approvalUrl);
        
        // QR con datos mínimos para escaneo fiable (menos bytes = menos truncados). La URL se arma en el front con id.
        const qrData = {
          id: data.id,
          n: data.nombre,
          a: data.apellido,
          d: data.dni,
          c: data.categoria,
          cd: data.categoria === 'auto' ? data.categoria_auto : data.categoria === 'moto' ? (data.categoria_moto || data.categoria_moto_china) : data.categoria_cuatri,
          e: data.email,
          t: data.telefono,
          num: data.numero
        };
        
        // El QR contiene JSON con datos del piloto + url: así al escanear se muestran nombre, DNI, etc. aunque falle la API
        const qrText = JSON.stringify(qrData);
        qrDataUrl = await QRCode.toDataURL(qrText, {
          errorCorrectionLevel: 'H', // Mayor corrección de errores
          type: 'image/png',
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        console.log('QR generado exitosamente para piloto:', data.id);
        console.log('URL de aprobación:', approvalUrl);
      } catch (qrError: any) {
        console.error('Error generando QR:', qrError);
        // No fallar la inscripción si el QR falla, solo no incluirlo
      }

      // Enviar email con QR (no bloquea la respuesta si falla)
      if (qrDataUrl && email) {
        console.log('📧 Preparando envío de email con QR...');
        sendEmailWithQR(
          email,
          nombre,
          apellido,
          dni,
          categoria,
          numero || null,
          categoria === 'auto' ? categoria_auto : categoria === 'moto' ? (categoria_moto || categoria_moto_china) : categoria_cuatri,
          qrDataUrl
        ).catch((emailError) => {
          console.error('❌ Error enviando email (no crítico):', emailError);
          console.error('❌ Error details:', JSON.stringify(emailError, null, 2));
        });
      } else {
        console.warn('⚠️ No se enviará email - QR o email faltante:', { hasQr: !!qrDataUrl, hasEmail: !!email });
      }

      res.status(201).json({
        message: 'Inscripción realizada exitosamente',
        data,
        qrDataUrl
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Error al procesar la inscripción' });
    }
  } else if (method === 'GET' && (path.startsWith('/api/pilots/check/') || query.dni)) {
    // Verificar piloto por DNI
    try {
      const dni = (path.split('/api/pilots/check/')[1] || query.dni) as string;
      
      if (!dni) {
        return res.status(400).json({ error: 'DNI requerido' });
      }

      const { data: pilot, error } = await supabaseAdmin
        .from('pilots')
        .select('*')
        .eq('dni', dni)
        .single();
      
      if (error || !pilot) {
        return res.status(404).json({ error: 'No se encontró inscripción con ese DNI' });
      }

      res.json(pilot);
    } catch (error: any) {
      console.error('Check error:', error);
      res.status(500).json({ error: 'Error al consultar la inscripción' });
    }
  } else if (method === 'GET' && path === '/api/pilots/used-numbers') {
    // Autos, motos y cuatriciclos usan números distintos: categoria es obligatoria.
    try {
      const categoria = (query.categoria as string)?.toLowerCase();
      if (!isCategoriaNumerada(categoria)) {
        return res.status(400).json({ error: 'categoria es obligatoria y debe ser "auto", "moto" o "cuatri"' });
      }

      // Incluir todos los estados: la BD solo permite un número por categoría (también rechazados bloquean).
      const { data: pilots, error } = await supabaseAdmin
        .from('pilots')
        .select('numero')
        .not('numero', 'is', null)
        .eq('categoria', categoria);

      if (error) {
        console.error('Error obteniendo números usados:', error);
        return res.status(500).json({ error: 'Error al obtener números usados' });
      }

      console.log('📋 Pilotos encontrados con números:', pilots);
      console.log('📋 Categoría filtrada:', categoria);

      const usedNumbers = processUsedNumbers(pilots || []);

      console.log('📊 Números usados encontrados para categoría', categoria, ':', usedNumbers);
      res.json(usedNumbers);
    } catch (error: any) {
      console.error('Used numbers error:', error);
      res.status(500).json({ error: 'Error al obtener números usados' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
