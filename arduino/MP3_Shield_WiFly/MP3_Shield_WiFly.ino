#include <SPI.h>
#include <WiFly.h>
#include <SD.h>

#include <SFEMP3Shield.h>

// Below is not needed if interrupt driven. Safe to remove if not using.
#if defined(USE_MP3_REFILL_MEANS) && USE_MP3_REFILL_MEANS == USE_MP3_Timer1
  #include <TimerOne.h>
#elif defined(USE_MP3_REFILL_MEANS) && USE_MP3_REFILL_MEANS == USE_MP3_SimpleTimer
  #include <SimpleTimer.h>
#endif

SFEMP3Shield MP3player;

// Our two files for playing songs
File trackOneFile;
File trackTwoFile;
boolean playing = false;

#define TRACK_ONE_FILE_NAME "TRACK001.MP3"
#define TRACK_TWO_FILE_NAME "TRACK002.MP3"

WiFlyClient client("entranceapp.herokuapp.com", 80);

void printFreeRam() {
  Serial.print(F("Free RAM = ")); // available in Version 1.0 F() bases the string to into Flash, to use less SRAM.
  Serial.print(FreeRam(), DEC);  // FreeRam() is provided by SdFatUtil.h
  Serial.println(F(" Should be a base line of 1095, on ATmega328 when using INTx"));
}

void initializeSD() {
  //Initialize the SdCard.
  // see if the card is present and can be initialized:
  if (!SD.begin(9)) {
    Serial.println("SD card failed, or not present");
    // don't do anything more:
    return;
  }
  Serial.println("SD card initialized.");
}

void initMP3Player() {
  //Initialize the MP3 Player Shield
  uint8_t result = MP3player.begin();
  //check result, see readme for error codes.
  if(result != 0) {
    Serial.print(F("Error code: "));
    Serial.print(result);
    Serial.println(F(" when trying to start MP3 player"));
    if( result == 6 ) {
      Serial.println(F("Warning: patch file not found, skipping.")); // can be removed for space, if needed.
      Serial.println(F("Use the \"d\" command to verify SdCard can be read")); // can be removed for space, if needed.
    }
  }
}

void WiflyConnect() {
  WiFly.begin(115200);
    
  if (!WiFly.join("OLIN_GUEST", "The_Phoenix_Flies")) {
    Serial.println("Association failed.");
    while (1) {
      // Hang on failure.
    }
  }  

  if (client.connect()) {
    delay(10);
    Serial.println("connected");
    client.println("GET /arduino/stream HTTP/1.0");
    client.println("Host: entranceapp.herokuapp.com");
    client.println();
    delay(1);
  } else {
    Serial.println("connection failed");
  }
}


void setup() {
  
  Serial.begin(115200);

  printFreeRam();

  initializeSD();

  initMP3Player();
  
  WiflyConnect();
  
  // Delete the old files
  if(SD.remove(TRACK_ONE_FILE_NAME)) {
     Serial.print("Removal supposedly succesful"); 
  } else {
     Serial.println("Did not succesfully delete track"); 
  }
  SD.remove(TRACK_TWO_FILE_NAME);
  
  // Make some new ones
  trackOneFile = SD.open(TRACK_ONE_FILE_NAME, FILE_WRITE);
  trackTwoFile = SD.open(TRACK_TWO_FILE_NAME, FILE_WRITE);
  
}

int i = 0;
void loop() {

// Below is only needed if not interrupt driven. Safe to remove if not using.
#if defined(USE_MP3_REFILL_MEANS) \
    && ( (USE_MP3_REFILL_MEANS == USE_MP3_SimpleTimer) \
    ||   (USE_MP3_REFILL_MEANS == USE_MP3_Polled)      )

  MP3player.available();
#endif

  // If we have something to write, write it
  if (client.available()) {
    trackOneFile.write(client.read());
    trackOneFile.flush();
  }
  
  if (trackOneFile.position() != 0 && !trackOneFile.position() % 1000) {
     Serial.println("We've taken off, monsiour!"); 
  }
  
//  if (!playing && (trackOneFile.position() >= 10000)) {
//      Serial.println("Playing track now...");
//      MP3player.playTrack(1);
//      playing = true;
//  }

}



