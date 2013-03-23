#include <SPI.h>
#include <WiFly.h>
#include "Credentials.h"

WiFlyClient client("entranceapp.herokuapp.com", 80);

void setup() {
  
  Serial.begin(9600);
  
  Serial.println("Starting up board...");

  // Make this super fast because the I2C->UART can
  // supposedely support it
  WiFly.begin(115200);

  Serial.print("Checking connection to ");
  Serial.println(ssid);
  
  if (!WiFly.join(ssid, passphrase)) {
    Serial.println("Association failed.");
    while (1) {
      // Hang on failure.
    }
  }  

  if (client.connect()) {
    delay(10);
    Serial.println("connected");
    client.println("GET /test/stream HTTP/1.0");
    client.println("Host: entranceapp.herokuapp.com");
    client.println();
    delay(1);
  } else {
    Serial.println("connection failed");
  }

  Serial.println("Listening...");
}


void loop() {
  while (client.connected()) {
    Serial.println(client.read());
  }
}


