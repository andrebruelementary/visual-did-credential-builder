package com.elementarysoftware.prism;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Properties;
import java.util.Vector;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import io.iohk.atala.prism.api.KeyGenerator;
import io.iohk.atala.prism.crypto.derivation.KeyDerivation;
import io.iohk.atala.prism.crypto.derivation.MnemonicCode;
import io.iohk.atala.prism.crypto.keys.ECKeyPair;
import io.iohk.atala.prism.identity.Did;
import io.iohk.atala.prism.identity.LongFormPrismDid;
import io.iohk.atala.prism.identity.PrismDid;
import io.iohk.atala.prism.identity.PrismKeyType;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.xml.sax.SAXException;

import com.elementarysoftware.io.FileOperations;
import com.ibm.icu.impl.locale.XCldrStub.FileUtilities;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DIDVault {

	private File rootDirectory;
	//List<String> didNames = new Vector<String>();
	//List<String> didSeedFilePaths = new Vector<String>();
	List<DID> dids = new Vector<DID>();

	public DIDVault() throws FileNotFoundException {

		this(new File("did_vault"));

	}

	public DIDVault(File f) throws FileNotFoundException {

		if(f.isDirectory()) {
			rootDirectory = f;
			loadDIDs();
		}
		else {
			if(f.mkdirs()) {
				rootDirectory = f;
			}
			else {
				throw new FileNotFoundException("Unable to create DID Vault root directory");
			}
		}
	}

	public DID restoreFromSeedPhrases(String name, List<String> seedPhrases, String passphrase) throws Exception {

		MnemonicCode code = new MnemonicCode(seedPhrases);

		KeyDerivation keyder = KeyDerivation.INSTANCE;

		byte[] seed = keyder.binarySeed(code, passphrase);

		KeyGenerator generator = KeyGenerator.INSTANCE;

		ECKeyPair masterKeyPair = generator.deriveKeyFromFullPath(seed, 0, PrismKeyType.INSTANCE.getMASTER_KEY(), 0);

		LongFormPrismDid unpublishedDid = PrismDid.buildLongFormFromMasterPublicKey(masterKeyPair.getPublicKey());

		Did didCanonical = unpublishedDid.asCanonical().getDid();
		Did didLongForm = unpublishedDid.getDid();

		System.out.println("canonical: "+ didCanonical);
		System.out.println("long form: "+ didLongForm);

		DocumentBuilderFactory docFactory = DocumentBuilderFactory.newInstance();
		DocumentBuilder docBuilder = docFactory.newDocumentBuilder();

		Document doc = docBuilder.newDocument();
		Element rootElement = doc.createElement("did");
		rootElement.setAttribute("name", name);
		doc.appendChild(rootElement);


		File didMetadata = File.createTempFile("did_", ".xml", rootDirectory);

		File seedFile = new File(didMetadata.getAbsolutePath()+"_seed.bytes");
		try (FileOutputStream fos = new FileOutputStream(seedFile)) {
			fos.write(seed);
			//fos.close // no need, try-with-resources auto close
		}

		Element seedElement = doc.createElement("seed");
		seedElement.setTextContent(seedFile.getAbsolutePath());
		rootElement.appendChild(seedElement);

		// write DOM document to a file
		try (FileOutputStream output =
				new FileOutputStream(didMetadata.getAbsolutePath())) {
			FileOperations.writeXml(doc, output);
		} catch (IOException e) {
			e.printStackTrace();
		}

		return new DID(name, didMetadata.getAbsolutePath(), seedFile.getAbsolutePath());
	}


	private void loadDIDs() {

		// loop through vault and get name of all dids
		List<String> files = new Vector<String>();

		// Instantiate the Factory
		DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
		try {
			// optional, but recommended
			// process XML securely, avoid attacks like XML External Entities (XXE)
			dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);

			// parse XML file
			DocumentBuilder db = dbf.newDocumentBuilder();


			files = FileOperations.findFiles(Paths.get(rootDirectory.getAbsolutePath()), "xml");

			//didNames.clear();
			//didSeedFilePaths.clear();

			for(int i = 0; i < files.size(); i++) {
				System.out.println("reading file "+ files.get(i));
				Document doc = db.parse(new File(files.get(i)));
				doc.getDocumentElement().normalize();

				Node xml_did = doc.getElementsByTagName("did").item(0);
				
				if(xml_did == null) continue;
				
				Element elem_did = (Element) xml_did;

				DID tmpDID = new DID(elem_did.getAttribute("name"), files.get(i), elem_did.getElementsByTagName("seed").item(0).getTextContent());
				dids.add(i, tmpDID);
				//didNames.add(elem_did.getAttribute("name"));

				//didSeedFilePaths.add(elem_did.getElementsByTagName("seed").item(0).getTextContent());

			}

		}
		catch (SAXException saxe) {
			System.err.println("Error reading DID settings. "+ saxe.getMessage());
		}
		catch (ParserConfigurationException pce) {
			System.err.println("Error reading DIDs. "+ pce.getMessage());
		}
		catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

	}

	public String[] getDIDNames() {
		List<String> didNames = new Vector<String>(dids.size());
		for(int i = 0; i < dids.size(); i++) {
			didNames.add(i, dids.get(i).getName());
		}
		return didNames.toArray(String[]::new);
	}

	

	public String getDIDSeed(int didIndex) {
		//return didSeedFilePaths.get(didIndex);
		return dids.get(didIndex).getSeedFilePath();
	}

	public DID createNewDID(String name, String passphrase) throws Exception {

		KeyDerivation keyder = KeyDerivation.INSTANCE;

		byte[] seed = keyder.binarySeed(keyder.randomMnemonicCode(), passphrase);

		KeyGenerator generator = KeyGenerator.INSTANCE;

		ECKeyPair masterKeyPair = generator.deriveKeyFromFullPath(seed, 0, PrismKeyType.INSTANCE.getMASTER_KEY(), 0);

		LongFormPrismDid unpublishedDid = PrismDid.buildLongFormFromMasterPublicKey(masterKeyPair.getPublicKey());

		Did didCanonical = unpublishedDid.asCanonical().getDid();
		Did didLongForm = unpublishedDid.getDid();

		System.out.println("canonical: "+ didCanonical);
		System.out.println("long form: "+ didLongForm);

		DocumentBuilderFactory docFactory = DocumentBuilderFactory.newInstance();
		DocumentBuilder docBuilder = docFactory.newDocumentBuilder();

		Document doc = docBuilder.newDocument();
		Element rootElement = doc.createElement("did");
		rootElement.setAttribute("name", name);
		doc.appendChild(rootElement);


		File didMetadata = File.createTempFile("did_", ".xml", rootDirectory);

		File seedFile = new File(didMetadata.getAbsolutePath()+"_seed.bytes");
		try (FileOutputStream fos = new FileOutputStream(seedFile)) {
			fos.write(seed);
			//fos.close // no need, try-with-resources auto close
		}

		Element seedElement = doc.createElement("seed");
		seedElement.setTextContent(seedFile.getAbsolutePath());
		rootElement.appendChild(seedElement);

		// write DOM document to a file
		try (FileOutputStream output =
				new FileOutputStream(didMetadata.getAbsolutePath())) {
			FileOperations.writeXml(doc, output);
		} catch (IOException e) {
			e.printStackTrace();
		}

		return new DID(name, didMetadata.getAbsolutePath(), seedFile.getAbsolutePath());

	}

	public DID[] getAllDIDs() {
		//loadDIDs();
		/*Vector<DID> dids = new Vector<DID>(didNames.size());

		for(int i = 0; i < didNames.size(); i++) {
			dids.add(i, new DID(didNames.get(i), didSeedFilePaths.get(i)));
		}
		return dids.toArray(DID[]::new);*/
		return dids.toArray(DID[]::new);
	}

	public static void createNewVault(String databaseName, String username, String password) {
		
		String framework = "embedded";
		String protocol = "jdbc:derby:";
		
		Properties props = new Properties(); // connection properties
        // providing a user name and password is optional in the embedded
        // and derbyclient frameworks
        props.put("user", username);
        props.put("password", password);
        	
		try {
			
			// TODO: In future release, introduce a settings page and let user specify the location of databases.
			// Currently the vault databases are simply created in the vaults folder.
			// Derby JDBC use the setting "user.dir" which by default is the running Java project directory. Settings page need to change this environment variable
			// or in another way change where the databases are created
				
			Connection conn = DriverManager.getConnection(protocol + "./vaults/" + databaseName+ ";create=true", props);
		
			DatabaseMetaData dbInfo = conn.getMetaData();
			System.out.println("Database product = "+ dbInfo.getDatabaseProductName());
			System.out.println("Database driver = "+ dbInfo.getDriverName());
			System.out.println("Database url = "+ dbInfo.getURL());
			System.out.println("Connected as user = "+ dbInfo.getUserName());
			
			// lagring av byte[] i BLOB kolonne: https://db.apache.org/derby/docs/10.13/ref/rrefblob.html
			
			
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
			
	}

	public boolean containsDID(String didNameToCheck) {
		for(int i = 0; i < dids.size(); i++) {
			if(dids.get(i).getName().toLowerCase().equals(didNameToCheck.toLowerCase())) return true;
		}
		return false;
	}

	/*public void setDIDOperationHash(DID did, String operationHash) {

		//didSeedFilePaths.indexOf(loadedDID)

	}*/


}
