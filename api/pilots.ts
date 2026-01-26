import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabase';
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

    const categoriaTexto = categoria === 'auto' ? 'Auto' : 'Moto';
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
        numero,
        comprobante_pago_url,
        certificado_medico_url
      } = req.body;

      if (!nombre || !apellido || !dni || !email || !telefono || !fecha_nacimiento) {
        return res.status(400).json({ error: 'Campos requeridos faltantes' });
      }

      if (!categoria) {
        return res.status(400).json({ error: 'El tipo de vehículo (Auto/Moto) es requerido' });
      }

      if (!comprobante_pago_url) {
        return res.status(400).json({ error: 'El comprobante de pago es obligatorio' });
      }

      // Validar campos requeridos para autos
      if (categoria === 'auto') {
        if (!numero || numero < 1 || numero > 250) {
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

      // Validar campos requeridos para motos
      if (categoria === 'moto') {
        if (!numero || numero < 1 || numero > 250) {
          return res.status(400).json({ error: 'Para motos, debes seleccionar un número entre 01 y 250' });
        }
        if (!categoria_moto) {
          return res.status(400).json({ error: 'Para motos, debes seleccionar una categoría' });
        }
        
        // Verificar si el número ya está asignado a otro piloto de MOTO
        // Los números son únicos solo dentro de la misma categoría
        const { data: existingPilot, error: checkError } = await supabaseAdmin
          .from('pilots')
          .select('id, nombre, apellido, dni')
          .eq('numero', numero)
          .eq('categoria', 'moto')
          .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error verificando número:', checkError);
        }
        
        if (existingPilot) {
          return res.status(400).json({ 
            error: `El número ${numero.toString().padStart(2, '0')} ya está asignado a otro piloto de moto (${existingPilot.nombre} ${existingPilot.apellido}). Por favor, selecciona otro número.` 
          });
        }
      }


      // Insertar piloto directamente (las políticas RLS permiten INSERT público)
      // Si hay duplicados (DNI o número), el error lo manejamos abajo
      const insertClient = supabasePublic || supabaseAdmin;
      
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
        categoria_moto: categoria === 'moto' ? categoria_moto : null,
        numero: (categoria === 'auto' || categoria === 'moto') ? numero : null,
        comprobante_pago_url: comprobante_pago_url || null,
        certificado_medico_url: certificado_medico_url,
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
          if (error.message?.includes('numero') || error.message?.includes('pilots_numero_key') || error.message?.includes('pilots_numero_auto_unique') || error.message?.includes('pilots_numero_moto_unique')) {
            const categoriaTexto = categoria === 'auto' ? 'auto' : 'moto';
            return res.status(400).json({ 
              error: `El número ${numero ? numero.toString().padStart(2, '0') : ''} ya está asignado a otro piloto de ${categoriaTexto}. Por favor, selecciona otro número disponible.` 
            });
          }
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
        const qrData = {
          id: data.id,
          dni: data.dni,
          nombre: data.nombre,
          apellido: data.apellido,
          categoria: data.categoria,
          numero: data.numero,
          categoria_detalle: data.categoria === 'auto' ? data.categoria_auto : data.categoria_moto,
          email: data.email,
          telefono: data.telefono
        };
        
        // Crear un texto más legible que también sea parseable
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
          categoria === 'auto' ? categoria_auto : categoria_moto,
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
    // Endpoint público para obtener números usados por categoría
    // Los números son únicos solo dentro de cada categoría (autos y motos tienen numeración separada)
    try {
      const categoria = query.categoria as string | undefined;
      
      let queryBuilder = supabaseAdmin
        .from('pilots')
        .select('numero')
        .not('numero', 'is', null);
      
      // Si se especifica categoría, filtrar por ella
      if (categoria && (categoria === 'auto' || categoria === 'moto')) {
        queryBuilder = queryBuilder.eq('categoria', categoria);
      }
      
      const { data: pilots, error } = await queryBuilder;
      
      if (error) {
        console.error('Error obteniendo números usados:', error);
        return res.status(500).json({ error: 'Error al obtener números usados' });
      }

      console.log('📋 Pilotos encontrados con números:', pilots);
      console.log('📋 Categoría filtrada:', categoria);

      const usedNumbers = pilots
        .map((p: any) => {
          // Asegurar que el número sea un entero
          const num = typeof p.numero === 'string' ? parseInt(p.numero, 10) : Number(p.numero);
          console.log('🔢 Procesando número:', p.numero, '->', num, '(tipo:', typeof num, ')');
          return num;
        })
        .filter((num: number | null) => {
          const isValid = num !== null && !isNaN(num) && num >= 1 && num <= 250;
          if (!isValid) {
            console.log('⚠️ Número inválido filtrado:', num);
          }
          return isValid;
        })
        .sort((a: number, b: number) => a - b);

      console.log('📊 Números usados encontrados para categoría', categoria, ':', usedNumbers);
      console.log('📊 Tipo de array:', Array.isArray(usedNumbers));
      console.log('📊 Primer elemento tipo:', typeof usedNumbers[0]);
      res.json(usedNumbers);
    } catch (error: any) {
      console.error('Used numbers error:', error);
      res.status(500).json({ error: 'Error al obtener números usados' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
