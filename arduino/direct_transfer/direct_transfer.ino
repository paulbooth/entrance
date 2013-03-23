// (Based on Ethernet's WebClient Example)

#include <SPI.h>
#include <WiFly.h>

#define MP3_XCS 9 //Control Chip Select Pin (for accessing SPI Control/Status registers)
#define MP3_XDCS 2 //Data Chip Select / BSYNC Pin
#define MP3_DREQ 3 //Data Request Pin: Player asks for more data

/** VS10xx SCI Registers */
#define SPI_MODE 0x0   /**< VS10xx register */
#define SPI_STATUS 0x1   /**< VS10xx register */
#define SPI_CLOCKF 0x3   /**< VS10xx register */
#define SPI_AUDATA 0x5   /**< VS10xx register */
#define SPI_VOL 0xb   /**< VS10xx register */

WiFlyClient client("entranceapp.herokuapp.com", 80);

int index = 0;
const int maxSize = 128;
int buffer[maxSize] = {};

void addValue(unsigned char buf);
unsigned char shiftArray();

void InitMicrocontroller(){
  SPI.setClockDivider(SPI_CLOCK_DIV64);//slow SPI bus speed
  SPI.transfer(0xFF);
}

void SPIWait(){
  while (!digitalRead(MP3_DREQ)){};  
}


void SPIInit(){
  //max SDI clock freq = CLKI/7 and (datasheet) CLKI = 36.864, hence max clock = 5MHz
  //SPI clock arduino = 16MHz. 16/ 4 = 4MHz -- ok!
  SPI.setClockDivider(SPI_CLOCK_DIV2);
}

//Write to VS10xx register
//SCI: Data transfers are always 16bit. When a new SCI operation comes in 
//DREQ goes low. We then have to wait for DREQ to go high again.
//XCS should be low for the full duration of operation.
void Mp3WriteRegister(unsigned char addressbyte, unsigned char highbyte, unsigned char lowbyte){
  while(!digitalRead(MP3_DREQ)) ; //Wait for DREQ to go high indicating IC is available
  digitalWrite(MP3_XCS, LOW); //Select control

  //SCI consists of instruction byte, address byte, and 16-bit data word.
  SPI.transfer(0x02); //Write instruction
  SPI.transfer(addressbyte);
  SPI.transfer(highbyte);
  SPI.transfer(lowbyte);
  while(!digitalRead(MP3_DREQ)) ; //Wait for DREQ to go high indicating command is complete
  digitalWrite(MP3_XCS, HIGH); //Deselect Control
}

//Read the 16-bit value of a VS10xx register
unsigned int Mp3ReadRegister (unsigned char addressbyte){
  while(!digitalRead(MP3_DREQ)) ; //Wait for DREQ to go high indicating IC is available
  digitalWrite(MP3_XCS, LOW); //Select control

  //SCI consists of instruction byte, address byte, and 16-bit data word.
  SPI.transfer(0x03); //Read instruction
  SPI.transfer(addressbyte);

  char response1 = SPI.transfer(0xFF); //Read the first byte
  while(!digitalRead(MP3_DREQ)) ; //Wait for DREQ to go high indicating command is complete
  char response2 = SPI.transfer(0xFF); //Read the second byte
  while(!digitalRead(MP3_DREQ)) ; //Wait for DREQ to go high indicating command is complete

  digitalWrite(MP3_XCS, HIGH); //Deselect Control

  int resultvalue = response1 << 8;
  resultvalue |= response2;
  return resultvalue;
}

//Set VS10xx Volume Register
void Mp3SetVolume(unsigned char leftchannel, unsigned char rightchannel){
  Mp3WriteRegister(SPI_VOL, leftchannel, rightchannel);
}

/** Soft Reset of VS10xx (Between songs) */
void Mp3SoftReset(){
  InitMicrocontroller();
  Mp3WriteRegister (SPI_MODE, 0x08, 0x44);
  /* Newmode, Reset, No L1-2, stream enabled */
  delay(1); /* One millisecond delay */
  SPIWait();
  /* Set clock register, doubler etc. */
  Mp3WriteRegister(SPI_CLOCKF, 0x88, 0x00);
  delay(1); /* One millisecond delay */
  SPIWait();
  SPIInit();         
  Mp3SetVolume(0xff,0xff); //Declick: Immediately switch analog off
  /* Declick: Slow sample rate for slow analog part startup */
  Mp3WriteRegister(SPI_AUDATA, 0, 10); /* 10 Hz */
  delay(100);
  /* Switch on the analog parts */
  Mp3SetVolume(0xfe,0xfe);
  Mp3WriteRegister (SPI_AUDATA, 0xAC, 0x45);//stereo, 44100KHz sampling
  Mp3SetVolume(20,20); // Set initial volume (20 = -10dB)             
}

void setup() {
  
  pinMode(MP3_DREQ, INPUT);
  pinMode(MP3_XCS, OUTPUT);
  pinMode(MP3_XDCS, OUTPUT);
  digitalWrite(MP3_XCS, HIGH);
  digitalWrite(MP3_XDCS, HIGH);
  
  Serial.begin(9600); //Use serial for debugging 
  Serial.println("MP3 Shield Example");

  //Setup SPI for VS1053
  SPI.begin();
  WiFly.begin();

  Mp3SetVolume(20, 20); //Set initial volume (20 = -10dB)

//  
  Serial.println("Checking connection to guest.");
  
  if (!WiFly.join("OLIN_GUEST", "The_Phoenix_Flies")) {
    Serial.println("Association failed.");
    while (1) {
      // Hang on failure.
    }
  }  

   
  Mp3SoftReset();
  
  delay(500);

  

  cli();//disable interrupts
  //set timer0 interrupt at 40kHz
  TCCR0A = 0;// set entire TCCR0A register to 0
  TCCR0B = 0;// same for TCCR0B
  TCNT0  = 0;//initialize counter value to 0
  // set compare match register for 40khz increments
  OCR0A = 49;// = (16*10^6) / (2000*8) - 1 (must be <256)
  // turn on CTC mode
  TCCR0A |= (1 << WGM01);
  // Set CS11 bit for 8 prescaler
  TCCR0B |= (1 << CS11); 
  // enable timer compare interrupt
  TIMSK0 |= (1 << OCIE0A);
  sei();//enable interrupts
  Serial.println("Starting loop");
}
unsigned char b;
void loop() {
  
  if (client.connect()) {
    delay(10);
    Serial.println("connected");
    client.println("GET /test/stream HTTP/1.0");
    client.println("Host: entranceapp.herokuapp.com");
    client.println();
    delay(1);
    
    while (client.connected()) {
      b = client.read();
      digitalWrite(MP3_XDCS, LOW); //Select Data
      SPI.transfer(b); // Send SPI byte
//    Serial.println(b, HEX);
    digitalWrite(MP3_XDCS, HIGH); //Deselect Data
      }
    } 
    else {
      Serial.println("connection failed");
    }
}

