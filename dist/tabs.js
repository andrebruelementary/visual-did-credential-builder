// Tab switching functionality and contact management
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');
    
    // Initialize tab switching
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log('Found tabs:', tabs.length);
    console.log('Found tab contents:', tabContents.length);
    
    tabs.forEach(tab => {
      console.log('Adding click listener to tab:', tab.getAttribute('data-tab'));
      
      tab.addEventListener('click', (event) => {
        console.log('Tab clicked:', tab.getAttribute('data-tab'));
        
        const tabId = tab.getAttribute('data-tab');
        console.log('Tab ID:', tabId);
        
        // Update active tab
        tabs.forEach(t => {
          t.classList.remove('active');
        });
        
        tab.classList.add('active');
        console.log('Added active class to tab:', tab.getAttribute('data-tab'));
        
        // Update active content
        tabContents.forEach(content => {
          content.classList.remove('active');
          
          if (content.id === `${tabId}-tab`) {
            content.classList.add('active');
            console.log('Added active class to content:', content.id);
          }
        });
      });
    });
    
    // Initialize contact management for the Issue tab
    const contactsList = document.getElementById('contacts-list');
    const contactSearch = document.getElementById('contact-search');
    
    if (contactsList && contactSearch) {
      // Load sample contacts
      const sampleContacts = [
        { id: '1', name: 'Alice', did: 'did:example:alice' },
        { id: '2', name: 'Bob', did: 'did:example:bob' },
        { id: '3', name: 'Charlie', did: 'did:example:charlie' },
        { id: '4', name: 'University', did: 'did:example:university' },
        { id: '5', name: 'Work', did: 'did:example:work' },
        { id: '6', name: 'Doctor', did: 'did:example:doctor' }
      ];
      
      // Render contacts
      renderContacts(sampleContacts);
      
      // Add search functionality
      contactSearch.addEventListener('input', () => {
        const query = contactSearch.value.toLowerCase().trim();
        
        const contactItems = contactsList.querySelectorAll('.contact-item');
        contactItems.forEach(item => {
          const name = item.querySelector('.contact-name')?.textContent || '';
          
          if (name.toLowerCase().includes(query)) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      });
    }
    
    function renderContacts(contacts) {
      contactsList.innerHTML = '';
      
      contacts.forEach(contact => {
        const contactTemplate = document.getElementById('contact-item-template');
        const contactEl = contactTemplate.content.cloneNode(true);
        
        const contactItem = contactEl.querySelector('.contact-item');
        contactItem.setAttribute('data-contact-id', contact.id);
        contactItem.setAttribute('data-contact-did', contact.did);
        
        const nameEl = contactEl.querySelector('.contact-name');
        nameEl.textContent = contact.name;
        
        // Set up selection
        contactItem.addEventListener('click', () => {
          // Remove selected class from all contacts
          document.querySelectorAll('.contact-item').forEach(item => {
            item.classList.remove('selected');
          });
          
          // Add selected class to this contact
          contactItem.classList.add('selected');
          
          // Fire a custom event for the credential builder to handle
          const event = new CustomEvent('contact-selected', {
            detail: contact
          });
          document.dispatchEvent(event);
          
          console.log('Contact selected:', contact);
        });
        
        contactsList.appendChild(contactItem);
      });
    }
    
    // Use MutationObserver to watch for class changes
    const tabObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          console.log('Class modified on', mutation.target.id, 'New classes:', mutation.target.className);
        }
      });
    });
    
    // Add observers for each tab content
    const setupTab = document.getElementById('setup-tab');
    const didsTab = document.getElementById('dids-tab');
    const issueTab = document.getElementById('issue-tab');
    const verifyTab = document.getElementById('verify-tab');
    
    [setupTab, didsTab, issueTab, verifyTab].forEach(tab => {
      if (tab) {
        tabObserver.observe(tab, { attributes: true });
        console.log('Now observing class changes on:', tab.id);
      }
    });
  });