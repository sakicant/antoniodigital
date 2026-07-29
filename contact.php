<?php
/**
 * Contact / inquiry form handler for antoniodigital.com.
 * Plain PHP mail() so it runs on standard shared PHP hosting (no DB needed).
 * The form posts here via fetch() and expects a JSON response.
 */

header('Content-Type: application/json; charset=utf-8');

$TO   = 'info@antoniodigital.com';
// "From" must be an address on your own domain, otherwise mail gets flagged as spoofed.
$FROM = 'noreply@antoniodigital.com';

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Neispravna metoda.', 405);
}

// Honeypot: real users never fill this hidden field. Pretend success for bots.
if (!empty($_POST['website'])) {
    echo json_encode(['success' => true]);
    exit;
}

function clean_line($v) {
    return trim(str_replace(["\r", "\n"], '', (string) $v));
}

$name    = clean_line($_POST['ime'] ?? '');
$email   = clean_line($_POST['email'] ?? '');
$company = clean_line($_POST['tvrtka'] ?? '');
$service = clean_line($_POST['usluga'] ?? '');
$message = trim((string) ($_POST['poruka'] ?? ''));

if ($name === '' || $email === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('Molimo ispunite sva obavezna polja s ispravnom email adresom.');
}

// GDPR: the sender must tick the consent box.
if (empty($_POST['consent'])) {
    fail('Molimo potvrdite privolu za obradu podataka.');
}

$allowed = ['Izrada web stranice', 'SEO optimizacija', 'Hosting', 'Održavanje', 'Ostalo'];
if (!in_array($service, $allowed, true)) {
    $service = 'Ostalo';
}

// Light file-based rate limit: at most 6 messages per IP per hour (no DB).
$ip   = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$file = sys_get_temp_dir() . '/ad_contact_' . md5($ip) . '.log';
$now  = time();
$hits = is_file($file)
    ? array_filter(array_map('intval', file($file)), function ($t) use ($now) { return $t > $now - 3600; })
    : [];
if (count($hits) >= 6) {
    fail('Previše poruka u kratkom vremenu. Pokušajte kasnije ili pišite na WhatsApp.', 429);
}
$hits[] = $now;
@file_put_contents($file, implode("\n", $hits));

$subject = 'Novi upit s antoniodigital.com - ' . $name;

$body  = "Novi upit s antoniodigital.com\n\n";
$body .= "Ime: $name\n";
$body .= "Email: $email\n";
$body .= 'Tvrtka: ' . ($company !== '' ? $company : 'nije navedeno') . "\n";
$body .= "Usluga: $service\n\n";
$body .= "Poruka:\n$message\n";

$headers  = 'From: Antonio Digital <' . $FROM . ">\r\n";
$headers .= 'Reply-To: ' . $email . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= 'X-Mailer: PHP/' . phpversion();

$encoded_subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$sent = @mail($TO, $encoded_subject, $body, $headers);

if ($sent) {
    echo json_encode(['success' => true]);
} else {
    fail('Slanje nije uspjelo. Pišite mi na WhatsApp ili email.', 500);
}
