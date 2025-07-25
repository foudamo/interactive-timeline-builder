<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if ($data) {
        $result = file_put_contents('positions.json', json_encode($data, JSON_PRETTY_PRINT));
        if ($result !== false) {
            echo json_encode(['success' => true, 'message' => 'Positions saved successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to write file']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>