#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void readflag(char* buf, size_t len) {
  char c;
  FILE *f = fopen("flag.txt", "r");
  if (f == NULL) {
    printf("%s", "flag.txt doesn't exist.");
    exit(0);
  }
  c = fgetc(f);
    while (c != EOF) {
      printf("%c", c);
      c = fgetc(f);
    }
  fclose(f);
  exit(0);
}

void segfault_sigaction(int signal, siginfo_t *si, void *arg) {
  char flag[64];
  printf("%s", "That's too much.\n");
  readflag(flag, 64);
  exit(0);
}

void vulnerableFunction() {
    char count[128];
    char buffer[100];
    
    printf("%s", "Counting is hard. Can you show me how to count to 100?\n");
    scanf("%s", count);
    strcpy(buffer, count);

    struct sigaction sa;
    memset(&sa, 0, sizeof(struct sigaction));
    sigemptyset(&sa.sa_mask);
    sa.sa_sigaction = segfault_sigaction;
    sa.sa_flags = SA_SIGINFO;
    sigaction(SIGSEGV, &sa, NULL);
    
    printf("%s%s%s", "Is this it?\n", count, "\n");
}

int main(int argc, char **argv) {

  vulnerableFunction();
  
  return 0;
}
